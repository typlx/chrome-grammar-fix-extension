const HOST_SELECTOR = 'div[data-gf-host]';

export async function waitForGrammarButton(page, timeout = 5000) {
  return page.waitForSelector(HOST_SELECTOR, { timeout });
}

export async function clickGrammarButton(page) {
  const host = await page.$(HOST_SELECTOR);
  if (!host) throw new Error('Grammar button host not found');
  const box = await host.boundingBox();
  if (!box) throw new Error('Grammar button host not visible');
  await page.mouse.click(box.x + box.width - 20, box.y + box.height - 20);
}

export async function withShadow(page, fn) {
  const cdp = await page.createCDPSession();
  try {
    return await fn(new ShadowHelper(cdp, page));
  } finally {
    await cdp.detach();
  }
}

class ShadowHelper {
  constructor(cdp, page) {
    this.cdp = cdp;
    this.page = page;
  }

  async findHost() {
    const { root } = await this.cdp.send('DOM.getDocument', { depth: -1, pierce: true });
    const { nodeId } = await this.cdp.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: HOST_SELECTOR,
    });
    return nodeId || null;
  }

  async findElement(shadowSelector) {
    const hostId = await this.findHost();
    if (!hostId) return null;

    const { node } = await this.cdp.send('DOM.describeNode', {
      nodeId: hostId,
      depth: 5,
      pierce: true,
    });
    if (!node.shadowRoots?.length) return null;

    const { nodeId } = await this.cdp.send('DOM.querySelector', {
      nodeId: node.shadowRoots[0].nodeId,
      selector: shadowSelector,
    });
    return nodeId || null;
  }

  async click(shadowSelector) {
    const nodeId = await this.findElement(shadowSelector);
    if (!nodeId) throw new Error(`Shadow element not found: ${shadowSelector}`);

    const { object } = await this.cdp.send('DOM.resolveNode', { nodeId });
    await this.cdp.send('Runtime.callFunctionOn', {
      objectId: object.objectId,
      functionDeclaration: 'function() { this.click(); }',
    });
  }

  async getText(shadowSelector) {
    const nodeId = await this.findElement(shadowSelector);
    if (!nodeId) return null;

    const { object } = await this.cdp.send('DOM.resolveNode', { nodeId });
    const { result } = await this.cdp.send('Runtime.callFunctionOn', {
      objectId: object.objectId,
      functionDeclaration: 'function() { return this.textContent; }',
      returnByValue: true,
    });
    return result.value;
  }

  async getHtml(shadowSelector) {
    const nodeId = await this.findElement(shadowSelector);
    if (!nodeId) return null;

    const { object } = await this.cdp.send('DOM.resolveNode', { nodeId });
    const { result } = await this.cdp.send('Runtime.callFunctionOn', {
      objectId: object.objectId,
      functionDeclaration: 'function() { return this.innerHTML; }',
      returnByValue: true,
    });
    return result.value;
  }

  async exists(shadowSelector) {
    return (await this.findElement(shadowSelector)) !== null;
  }

  async waitFor(shadowSelector, timeout = 10_000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await this.exists(shadowSelector)) return;
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`Timeout waiting for shadow element: ${shadowSelector}`);
  }
}

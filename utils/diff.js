export function computeWordDiff(original, corrected) {
  const originalWords = tokenize(original);
  const correctedWords = tokenize(corrected);
  const lcs = longestCommonSubsequence(originalWords, correctedWords);

  const changes = [];
  let oi = 0;
  let ci = 0;
  let li = 0;

  while (oi < originalWords.length || ci < correctedWords.length) {
    if (
      li < lcs.length &&
      oi < originalWords.length &&
      ci < correctedWords.length &&
      originalWords[oi] === lcs[li] &&
      correctedWords[ci] === lcs[li]
    ) {
      changes.push({ type: 'equal', value: originalWords[oi] });
      oi++;
      ci++;
      li++;
    } else if (li < lcs.length && oi < originalWords.length && originalWords[oi] !== lcs[li]) {
      changes.push({ type: 'removed', value: originalWords[oi] });
      oi++;
    } else if (li < lcs.length && ci < correctedWords.length && correctedWords[ci] !== lcs[li]) {
      changes.push({ type: 'added', value: correctedWords[ci] });
      ci++;
    } else if (li >= lcs.length && oi < originalWords.length) {
      changes.push({ type: 'removed', value: originalWords[oi] });
      oi++;
    } else if (li >= lcs.length && ci < correctedWords.length) {
      changes.push({ type: 'added', value: correctedWords[ci] });
      ci++;
    }
  }

  return mergeAdjacentChanges(changes);
}

function tokenize(text) {
  return text.match(/\S+|\s+/g) || [];
}

function longestCommonSubsequence(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return result;
}

function mergeAdjacentChanges(changes) {
  const merged = [];
  for (const change of changes) {
    const last = merged[merged.length - 1];
    if (last && last.type === change.type) {
      last.value += change.value;
    } else {
      merged.push({ ...change });
    }
  }
  return merged;
}

export function hasChanges(diff) {
  return diff.some((d) => d.type !== 'equal');
}

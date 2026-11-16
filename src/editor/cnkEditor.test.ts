import { Text } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { offsetOf } from './cnkEditor';

describe('エディタの位置の換算', () => {
  it('桁（文字数）を UTF-16 の位置にする（サロゲートペアの漢字は 2 単位）', () => {
    const doc = Text.of(['A', 'AB = 𠀋𠀋 x']);
    expect(offsetOf(doc, 2, 9)).toBe(2 + 10);
    expect(doc.sliceString(offsetOf(doc, 2, 9), offsetOf(doc, 2, 10))).toBe('x');
  });

  it('文書より後ろの行・桁は、文書の中に収める（文書が短くなったときに古い位置で落ちない）', () => {
    const doc = Text.of(['abc']);
    expect(offsetOf(doc, 5, 3)).toBe(2);
    expect(offsetOf(doc, 1, 99)).toBe(3);
  });
});

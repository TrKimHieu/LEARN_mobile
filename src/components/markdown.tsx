import { Lexer, type Token, type Tokens } from 'marked';
import { Fragment, useMemo } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { usePalette } from '@/theme/theme';
import { font, radius, space, type Palette } from '@/theme/tokens';

/**
 * Nội dung bài học (Markdown) → component native.
 *
 * Web render ra HTML rồi sanitize hai lớp (`apps/web/src/components/shared/markdown.tsx`). Ở đây
 * không có HTML nào được chạy: lexer của `marked` tách Markdown thành token, mỗi token vẽ bằng
 * `Text`/`View`. Khối HTML thô trong bài hiện dưới dạng chữ. Link chỉ mở http/https.
 *
 * Cùng tập thẻ web cho phép: heading, đoạn, danh sách, in đậm/nghiêng, code, trích dẫn, link,
 * đường kẻ, bảng.
 */
export interface TocEntry {
  index: number;
  text: string;
  depth: number;
}

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

/** Lexer để nguyên thực thể HTML của nguồn; bài cũ còn `&lt;` do sanitizer cũ (STATE phiên 23). */
function decode(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function plain(tokens: Token[] | undefined): string {
  return (tokens ?? [])
    .map((t) => ('tokens' in t && t.tokens ? plain(t.tokens) : 'text' in t ? decode(t.text) : ''))
    .join('');
}

export function useMarkdown(source: string) {
  return useMemo(() => {
    const tokens = new Lexer({ gfm: true }).lex(source);
    const toc: TocEntry[] = [];
    tokens.forEach((t, index) => {
      if (t.type === 'heading' && (t as Tokens.Heading).depth <= 3) {
        toc.push({ index, text: plain((t as Tokens.Heading).tokens), depth: (t as Tokens.Heading).depth });
      }
    });
    return { tokens, toc };
  }, [source]);
}

export function Markdown({
  tokens,
  onBlockLayout,
}: {
  tokens: Token[];
  /** Vị trí y của từng khối cấp cao nhất — để mục lục cuộn tới heading. */
  onBlockLayout?: (index: number, y: number) => void;
}) {
  const p = usePalette();
  const s = useMemo(() => makeStyles(p), [p]);
  return (
    <View style={{ gap: space.md }}>
      {tokens.map((t, i) => (
        <View key={i} onLayout={onBlockLayout ? (e) => onBlockLayout(i, e.nativeEvent.layout.y) : undefined}>
          <Block token={t} s={s} p={p} />
        </View>
      ))}
    </View>
  );
}

type S = ReturnType<typeof makeStyles>;

function Block({ token, s, p }: { token: Token; s: S; p: Palette }): React.ReactNode {
  switch (token.type) {
    case 'heading': {
      const h = token as Tokens.Heading;
      const style = h.depth <= 1 ? s.h1 : h.depth === 2 ? s.h2 : s.h3;
      return (
        <Text style={style} accessibilityRole="header" selectable>
          <Inline tokens={h.tokens} s={s} />
        </Text>
      );
    }
    case 'paragraph':
      return (
        <Text style={s.p} selectable>
          <Inline tokens={(token as Tokens.Paragraph).tokens} s={s} />
        </Text>
      );
    case 'text': {
      const t = token as Tokens.Text;
      return (
        <Text style={s.p} selectable>
          {t.tokens ? <Inline tokens={t.tokens} s={s} /> : decode(t.text)}
        </Text>
      );
    }
    case 'list': {
      const l = token as Tokens.List;
      const start = typeof l.start === 'number' ? l.start : 1;
      return (
        <View style={{ gap: space.xs }}>
          {l.items.map((item, i) => (
            <View key={i} style={s.li}>
              <Text style={[s.p, s.bullet]}>
                {item.task ? (item.checked ? '☑' : '☐') : l.ordered ? `${start + i}.` : '•'}
              </Text>
              <View style={{ flex: 1, gap: space.xs }}>
                {item.tokens.map((c, j) => (
                  <Block key={j} token={c} s={s} p={p} />
                ))}
              </View>
            </View>
          ))}
        </View>
      );
    }
    case 'code':
      return (
        <ScrollView horizontal focusable tabIndex={0} aria-label="Đoạn code" style={s.codeBlock} contentContainerStyle={{ padding: space.md }}>
          <Text style={s.codeText} selectable>
            {(token as Tokens.Code).text}
          </Text>
        </ScrollView>
      );
    case 'blockquote':
      return (
        <View style={s.quote}>
          {(token as Tokens.Blockquote).tokens.map((c, j) => (
            <Block key={j} token={c} s={s} p={p} />
          ))}
        </View>
      );
    case 'hr':
      return <View style={s.hr} />;
    case 'table': {
      const t = token as Tokens.Table;
      return (
        <ScrollView horizontal focusable tabIndex={0} aria-label="Bảng" style={s.table}>
          <View>
            <View style={[s.tr, { backgroundColor: p.muted }]}>
              {t.header.map((cell, j) => (
                <Text key={j} style={[s.td, s.th]}>
                  <Inline tokens={cell.tokens} s={s} />
                </Text>
              ))}
            </View>
            {t.rows.map((row, i) => (
              <View key={i} style={s.tr}>
                {row.map((cell, j) => (
                  <Text key={j} style={s.td} selectable>
                    <Inline tokens={cell.tokens} s={s} />
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      );
    }
    case 'html':
      return <Text style={[s.p, { color: p.fgSubtle }]}>{(token as Tokens.HTML).text.trim()}</Text>;
    case 'space':
      return null;
    default:
      return 'raw' in token ? <Text style={s.p}>{decode(token.raw)}</Text> : null;
  }
}

function Inline({ tokens, s, style }: { tokens: Token[] | undefined; s: S; style?: TextStyle }): React.ReactNode {
  if (!tokens) return null;
  return tokens.map((t, i) => {
    switch (t.type) {
      case 'strong':
        return (
          <Text key={i} style={[style, s.strong]}>
            <Inline tokens={(t as Tokens.Strong).tokens} s={s} />
          </Text>
        );
      case 'em':
        return (
          <Text key={i} style={[style, s.em]}>
            <Inline tokens={(t as Tokens.Em).tokens} s={s} />
          </Text>
        );
      case 'del':
        return (
          <Text key={i} style={[style, s.del]}>
            <Inline tokens={(t as Tokens.Del).tokens} s={s} />
          </Text>
        );
      case 'codespan':
        return (
          <Text key={i} style={s.codespan}>
            {decode((t as Tokens.Codespan).text)}
          </Text>
        );
      case 'link': {
        const l = t as Tokens.Link;
        const safe = /^https?:\/\//i.test(l.href);
        return (
          <Text
            key={i}
            style={s.link}
            accessibilityRole={safe ? 'link' : undefined}
            onPress={safe ? () => void Linking.openURL(l.href) : undefined}
          >
            <Inline tokens={l.tokens} s={s} />
          </Text>
        );
      }
      case 'br':
        return <Fragment key={i}>{'\n'}</Fragment>;
      case 'image':
        return (
          <Text key={i} style={{ fontStyle: 'italic' }}>
            [Hình: {(t as Tokens.Image).text}]
          </Text>
        );
      case 'text':
      case 'escape': {
        const tt = t as Tokens.Text;
        return tt.tokens ? (
          <Fragment key={i}>
            <Inline tokens={tt.tokens} s={s} />
          </Fragment>
        ) : (
          <Fragment key={i}>{decode(tt.text)}</Fragment>
        );
      }
      default:
        return <Fragment key={i}>{'raw' in t ? decode(t.raw) : ''}</Fragment>;
    }
  });
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    // Bài đọc: cỡ lớn hơn, dòng thưa hơn chữ giao diện (ADR 014 của LEARN).
    p: { fontFamily: font.regular, fontSize: 17, lineHeight: 27, color: p.fg },
    h1: { fontFamily: font.bold, fontSize: 24, lineHeight: 30, color: p.fg, marginTop: space.md },
    h2: { fontFamily: font.bold, fontSize: 21, lineHeight: 28, color: p.fg, marginTop: space.md },
    h3: { fontFamily: font.semibold, fontSize: 18, lineHeight: 25, color: p.fg, marginTop: space.sm },
    strong: { fontFamily: font.bold },
    em: { fontStyle: 'italic' },
    del: { textDecorationLine: 'line-through' },
    link: { textDecorationLine: 'underline', fontFamily: font.semibold },
    codespan: { fontFamily: MONO, fontSize: 15, backgroundColor: p.muted, color: p.fg },
    codeBlock: { backgroundColor: p.muted, borderRadius: radius.control },
    codeText: { fontFamily: MONO, fontSize: 14, lineHeight: 21, color: p.fg },
    li: { flexDirection: 'row', gap: space.sm },
    bullet: { minWidth: 18, color: p.fgSubtle },
    quote: { borderLeftWidth: 3, borderLeftColor: p.lineStrong, paddingLeft: space.md, gap: space.sm },
    hr: { height: 1, backgroundColor: p.line, marginVertical: space.sm },
    table: { borderWidth: 1, borderColor: p.line, borderRadius: radius.control },
    tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: p.line },
    td: {
      width: 160,
      padding: space.sm,
      fontFamily: font.regular,
      fontSize: 15,
      lineHeight: 21,
      color: p.fg,
    },
    th: { fontFamily: font.semibold },
  });
}

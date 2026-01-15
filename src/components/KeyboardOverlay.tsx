import React from 'react';

interface Props {
  expected: string[];
  visible: boolean;
}

const rows = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

const KeyboardOverlay: React.FC<Props> = ({ expected, visible }) => {
  if (!visible) return null;
  const normalized = expected.map((c) => c.toLowerCase());
  const primary = normalized[0];
  const alternates = normalized.slice(1);

  return (
    <div className="keyboard" aria-hidden>
      <div className="flex">
        <span className="badge">다음 키</span>
        <span className="badge">{expected.join(' / ') || '...'}</span>
      </div>
      {rows.map((row) => (
        <div key={row.join('')} className="key-row">
          {row.map((key) => (
            <div
              key={key}
              className={`keycap ${primary === key ? 'active' : ''} ${
                alternates.includes(key) ? 'alt' : ''
              }`}
            >
              {key}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default KeyboardOverlay;

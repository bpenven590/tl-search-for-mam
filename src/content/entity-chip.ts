export interface EntityChipData {
  id: string;
  name: string;
}

export class EntityChip {
  private el: HTMLElement;
  private data: EntityChipData;
  private onRemove: () => void;

  constructor(entity: EntityChipData, onRemove: () => void) {
    this.data = entity;
    this.onRemove = onRemove;
    this.el = this.build();
  }

  private build(): HTMLElement {
    const chip = document.createElement('span');
    chip.setAttribute('data-entity-chip', this.data.id);
    Object.assign(chip.style, {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 6px 2px 8px',
      background: 'rgba(0,220,130,0.12)',
      border: '1px solid var(--color-accent, #00DC82)',
      borderRadius: '999px',
      fontSize: '12px',
      color: 'var(--color-accent, #00DC82)',
      marginRight: '6px',
      verticalAlign: 'middle',
      lineHeight: '1.4',
      whiteSpace: 'nowrap' as const,
    });

    const label = document.createElement('span');
    label.textContent = `@${this.data.name}`;
    chip.appendChild(label);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'entity-chip-remove';
    removeBtn.textContent = '\u00D7'; // ×
    removeBtn.title = `Remove ${this.data.name}`;
    Object.assign(removeBtn.style, {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--color-accent, #00DC82)',
      fontSize: '13px',
      padding: '0 2px',
      lineHeight: '1',
      fontFamily: 'inherit',
    });
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onRemove();
    });
    chip.appendChild(removeBtn);

    return chip;
  }

  getElement(): HTMLElement {
    return this.el;
  }

  getData(): EntityChipData {
    return this.data;
  }
}

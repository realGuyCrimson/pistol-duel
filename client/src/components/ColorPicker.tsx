import { COLOR_PALETTE } from "../net/types";

interface Props {
  selected: string | null;
  taken: string | null;
  disabled?: boolean;
  onSelect: (color: string) => void;
}

export default function ColorPicker({ selected, taken, disabled, onSelect }: Props) {
  return (
    <div className="color-grid">
      {COLOR_PALETTE.map((color) => {
        const isTaken = taken === color;
        return (
          <button
            key={color}
            className={`swatch ${selected === color ? "selected" : ""} ${isTaken ? "disabled" : ""}`}
            style={{ background: color }}
            disabled={isTaken || disabled}
            onClick={() => onSelect(color)}
            aria-label={color}
            title={isTaken ? "Taken by opponent" : color}
          />
        );
      })}
    </div>
  );
}

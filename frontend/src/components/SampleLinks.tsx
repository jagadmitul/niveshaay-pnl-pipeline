interface Sample {
  label: string;
  url: string;
}

const SAMPLES: Sample[] = [
  {
    label: 'iValue Infosolutions — Q4 FY26 (extended schema example)',
    url: 'https://www.bseindia.com/xml-data/corpfiling/AttachLive/76172a81-6dbe-4c3d-aa78-e8a5fee0df72.pdf',
  },
  {
    label: 'Datamatics Global — quarterly result',
    url: 'https://www.bseindia.com/xml-data/corpfiling/AttachLive/d23685f3-a395-4ded-830e-fdbdbd769c45.pdf',
  },
  {
    label: 'Jubilant FoodWorks — Q1 result',
    url: 'https://www.bseindia.com/xml-data/corpfiling/AttachLive/0da7bdb4-7af1-41ef-8a20-bf97ab5dda68.pdf',
  },
];

interface Props {
  onPick: (url: string) => void;
  disabled?: boolean;
}

export function SampleLinks({ onPick, disabled }: Props) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs text-niveshaay-ink/50 mr-1">Try a sample:</span>
      {SAMPLES.map((s) => (
        <button
          key={s.url}
          type="button"
          className="btn-ghost"
          onClick={() => onPick(s.url)}
          disabled={disabled}
          title={s.url}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

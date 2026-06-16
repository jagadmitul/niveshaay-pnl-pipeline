interface Sample {
  label: string;
  url: string;
}

// Verified working BSE URLs (16 June 2026).
// Add new ones by grabbing fresh links from
// https://www.bseindia.com/corporates/Comp_Resultsnew.aspx
const SAMPLES: Sample[] = [
  {
    label: 'Bharat Forge',
    url: 'https://www.bseindia.com/xml-data/corpfiling/AttachHis/af9d0bd2-4d46-4d9a-bf64-73db891db83a.pdf',
  },
  {
    label: 'Relaxo Footwears',
    url: 'https://www.bseindia.com/xml-data/corpfiling/AttachLive/db7bceb7-ab7c-4eaf-b679-60c0dbc7bd75.pdf',
  },
  {
    label: 'Datamatics Global',
    url: 'https://www.bseindia.com/xml-data/corpfiling/AttachLive/d23685f3-a395-4ded-830e-fdbdbd769c45.pdf',
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

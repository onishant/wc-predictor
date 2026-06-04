type Props = {
  form: Array<'W' | 'D' | 'L'>;
};

const colors = {
  W: 'bg-emerald-500 text-emerald-950',
  D: 'bg-amber-400 text-amber-950',
  L: 'bg-rose-500 text-rose-950',
};

export function FormStrip({ form }: Props) {
  if (form.length === 0) {
    return <span className="text-xs text-slate-500">No finished World Cup matches yet</span>;
  }

  return (
    <span className="inline-flex gap-1" aria-label={`Recent World Cup form: ${form.join(', ')}`}>
      {form.map((result, index) => (
        <span key={`${result}-${index}`} className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${colors[result]}`}>
          {result}
        </span>
      ))}
    </span>
  );
}

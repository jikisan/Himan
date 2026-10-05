import { IdCard } from 'lucide-react';

const logos: Record<string, string> = {
  'PhilHealth': 'philhealth.png', 'Pag-IBIG': 'pag-ibig.png', 'SSS': 'sss.png',
  'TIN': 'bir.png', 'National ID': 'national-id.png', 'UMID': 'umid.png',
};

export function GovernmentAgencyMark({ agency }: { agency: string }) {
  const logo = logos[agency];
  return <span className="flex h-6 w-8 shrink-0 items-center justify-center rounded-md border bg-white p-0.5">
    {logo ? <img src={`/assets/government/${logo}`} alt="" className="h-full w-full object-contain" width={28} height={20} />
      : <IdCard aria-hidden="true" className="h-4 w-4 text-slate-700" />}
  </span>;
}

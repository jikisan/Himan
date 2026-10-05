import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { Feather } from '@expo/vector-icons';

const logos: Record<string, ImageSourcePropType> = {
  'PhilHealth': require('../../../../../assets/government/philhealth.png'),
  'Pag-IBIG': require('../../../../../assets/government/pag-ibig.png'),
  'SSS': require('../../../../../assets/government/sss.png'),
  'TIN': require('../../../../../assets/government/bir.png'),
  'National ID': require('../../../../../assets/government/national-id.png'),
  'UMID': require('../../../../../assets/government/umid.png'),
};

export function GovernmentAgencyMark({ agency }: { agency: string }) {
  return <View className="h-14 w-20 items-center justify-center rounded-xl border border-gray-200 bg-white p-2">
    {logos[agency] ? <Image accessible={false} source={logos[agency]} resizeMode="contain" style={{ width: 64, height: 40 }} />
      : <Feather accessible={false} name="credit-card" size={24} />}
  </View>;
}

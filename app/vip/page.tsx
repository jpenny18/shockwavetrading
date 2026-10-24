import VipExperience from './vip-experience';

export default function VipPage() {
  return <VipExperience publishableKey={process.env.VIPPK || ''} />;
}

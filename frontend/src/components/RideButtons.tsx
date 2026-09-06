import { Car } from "lucide-react";

interface Props {
  venueName: string;
  latitude: number | null;
  longitude: number | null;
}

export default function RideButtons({ venueName, latitude, longitude }: Props) {
  if (latitude == null || longitude == null) return null;

  const uberUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${latitude}&dropoff[longitude]=${longitude}&dropoff[nickname]=${encodeURIComponent(
    venueName
  )}`;

  const boltUrl = `https://bolt.eu/en/rides/?pickup=&dropoff_latitude=${latitude}&dropoff_longitude=${longitude}&dropoff_name=${encodeURIComponent(
    venueName
  )}`;

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={uberUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 border border-line hover:border-gold/50 bg-panel px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
      >
        <Car className="w-4 h-4 text-gold" />
        Ride with Uber
      </a>
      <a
        href={boltUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 border border-line hover:border-gold/50 bg-panel px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
      >
        <Car className="w-4 h-4 text-gold" />
        Ride with Bolt
      </a>
    </div>
  );
}

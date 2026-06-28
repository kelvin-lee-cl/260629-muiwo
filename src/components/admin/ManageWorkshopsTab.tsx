import { ManageVenueTab } from "@/components/admin/ManageVenueTab";
import { WorkshopFields } from "@/components/admin/WorkshopFields";
import type { BoothInput } from "@/lib/booths";

const emptyWorkshopForm: BoothInput = {
  id: "",
  title: "",
  code: "000",
  points: 0,
  type: "workshop",
  helperName: "",
  posterImageUrl: "",
  description: "",
  feature: undefined,
  workshopSlides: [],
};

type ManageWorkshopsTabProps = {
  getToken: () => Promise<string>;
  embedded?: boolean;
};

export function ManageWorkshopsTab({
  getToken,
  embedded = false,
}: ManageWorkshopsTabProps) {
  return (
    <ManageVenueTab
      getToken={getToken}
      venueType="workshop"
      title="Manage Workshops"
      subtitle="Set up workshops with optional features and slide image paths."
      addLabel="Workshop"
      emptyLabel="No workshops yet. Add one above."
      emptyForm={emptyWorkshopForm}
      FieldsComponent={WorkshopFields}
      embedded={embedded}
      badgeClassName="bg-violet-100 text-violet-800"
      accentButtonClassName="bg-violet-600 hover:bg-violet-700 focus:ring-violet-200"
    />
  );
}

import { BoothFields } from "@/components/admin/BoothFields";
import { ManageVenueTab } from "@/components/admin/ManageVenueTab";
import type { BoothInput } from "@/lib/booths";

const emptyBoothForm: BoothInput = {
  id: "",
  title: "",
  code: "",
  points: 10,
  type: "booth",
  helperName: "",
  posterImageUrl: "",
  description: "",
  feature: undefined,
};

type ManageBoothsTabProps = {
  getToken: () => Promise<string>;
  embedded?: boolean;
};

export function ManageBoothsTab({
  getToken,
  embedded = false,
}: ManageBoothsTabProps) {
  return (
    <ManageVenueTab
      getToken={getToken}
      venueType="booth"
      title="Manage Booths"
      subtitle="Add and edit booths. Features are optional."
      addLabel="Booth"
      emptyLabel="No booths yet. Add one above."
      emptyForm={emptyBoothForm}
      FieldsComponent={BoothFields}
      embedded={embedded}
      badgeClassName="bg-blue-100 text-blue-800"
      accentButtonClassName="bg-blue-600 hover:bg-blue-700 focus:ring-blue-200"
    />
  );
}

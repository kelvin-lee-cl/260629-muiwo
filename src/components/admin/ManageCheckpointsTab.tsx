import { CheckpointFields } from "@/components/admin/CheckpointFields";
import { ManageVenueTab } from "@/components/admin/ManageVenueTab";
import type { BoothInput } from "@/lib/booths";

const emptyCheckpointForm: BoothInput = {
  id: "",
  title: "",
  code: "",
  points: 5,
  type: "checkpoint",
  helperName: "",
  posterImageUrl: "",
  description: "",
  checkpointMode: undefined,
};

type ManageCheckpointsTabProps = {
  getToken: () => Promise<string>;
  embedded?: boolean;
};

export function ManageCheckpointsTab({
  getToken,
  embedded = false,
}: ManageCheckpointsTabProps) {
  return (
    <ManageVenueTab
      getToken={getToken}
      venueType="checkpoint"
      title="Manage Checkpoints"
      subtitle="Set up checkpoint codes and choose how students earn points."
      addLabel="Checkpoint"
      emptyLabel="No checkpoints yet. Add one above."
      emptyForm={emptyCheckpointForm}
      FieldsComponent={CheckpointFields}
      embedded={embedded}
      badgeClassName="bg-emerald-100 text-emerald-800"
      accentButtonClassName="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-200"
    />
  );
}

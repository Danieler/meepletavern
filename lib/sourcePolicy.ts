import type { SourceStatusKey } from "@/lib/editorialTypes";
import { normalizeSourcePermissions } from "@/lib/editorialMappers";

type SourcePolicyInput = {
  status: SourceStatusKey;
  permissions: unknown;
};

export type SourcePolicy = {
  canCreateCandidate: boolean;
  canUseMetadata: boolean;
  canUseImagePublicly: boolean;
  canUseDescriptionPublicly: boolean;
  canUsePrices: boolean;
  canStoreImagesLocally: boolean;
};

export function getSourcePolicy(source: SourcePolicyInput): SourcePolicy {
  const permissions = normalizeSourcePermissions(source.permissions);
  const isApproved = source.status === "approved";

  return {
    canCreateCandidate: source.status !== "rejected",
    canUseMetadata: permissions.canUseMetadata,
    canUseImagePublicly: isApproved && permissions.canUseImages,
    canUseDescriptionPublicly: isApproved && permissions.canUseDescriptions,
    canUsePrices: isApproved && permissions.canUsePrices,
    canStoreImagesLocally: isApproved && permissions.canStoreImagesLocally
  };
}

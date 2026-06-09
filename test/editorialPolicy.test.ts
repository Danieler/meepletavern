import test from "node:test";
import assert from "node:assert/strict";
import { MediaAssetStatus, MediaAssetUsage, SourceStatus } from "@prisma/client";
import { normalizeSourcePermissions } from "@/lib/editorialMappers";
import { canShowMedia } from "@/lib/mediaSafety";
import { getSourcePolicy } from "@/lib/sourcePolicy";

test("normalizeSourcePermissions returns false defaults for an empty object", () => {
  assert.deepEqual(normalizeSourcePermissions({}), {
    canUseMetadata: false,
    canUseImages: false,
    canUseDescriptions: false,
    canUsePrices: false,
    canStoreImagesLocally: false
  });
});

test("normalizeSourcePermissions ignores incorrect field types", () => {
  assert.deepEqual(
    normalizeSourcePermissions({
      canUseMetadata: "true",
      canUseImages: 1,
      canUseDescriptions: true,
      canUsePrices: null,
      canStoreImagesLocally: false
    }),
    {
      canUseMetadata: false,
      canUseImages: false,
      canUseDescriptions: true,
      canUsePrices: false,
      canStoreImagesLocally: false
    }
  );
});

test("getSourcePolicy allows approved sources according to explicit permissions", () => {
  assert.deepEqual(
    getSourcePolicy({
      status: "approved",
      permissions: {
        canUseMetadata: true,
        canUseImages: true,
        canUseDescriptions: true,
        canUsePrices: true,
        canStoreImagesLocally: true
      }
    }),
    {
      canCreateCandidate: true,
      canUseMetadata: true,
      canUseImagePublicly: true,
      canUseDescriptionPublicly: true,
      canUsePrices: true,
      canStoreImagesLocally: true
    }
  );
});

test("getSourcePolicy keeps contacted sources private except metadata", () => {
  assert.deepEqual(
    getSourcePolicy({
      status: "contacted",
      permissions: {
        canUseMetadata: true,
        canUseImages: true,
        canUseDescriptions: true,
        canUsePrices: true,
        canStoreImagesLocally: true
      }
    }),
    {
      canCreateCandidate: true,
      canUseMetadata: true,
      canUseImagePublicly: false,
      canUseDescriptionPublicly: false,
      canUsePrices: false,
      canStoreImagesLocally: false
    }
  );
});

test("getSourcePolicy rejects candidate creation for rejected sources", () => {
  assert.deepEqual(
    getSourcePolicy({
      status: "rejected",
      permissions: {
        canUseMetadata: true,
        canUseImages: true,
        canUseDescriptions: true,
        canUsePrices: true,
        canStoreImagesLocally: true
      }
    }),
    {
      canCreateCandidate: false,
      canUseMetadata: true,
      canUseImagePublicly: false,
      canUseDescriptionPublicly: false,
      canUsePrices: false,
      canStoreImagesLocally: false
    }
  );
});

test("getSourcePolicy handles incomplete permissions safely", () => {
  assert.deepEqual(
    getSourcePolicy({
      status: "approved",
      permissions: {
        canUseImages: true
      }
    }),
    {
      canCreateCandidate: true,
      canUseMetadata: false,
      canUseImagePublicly: true,
      canUseDescriptionPublicly: false,
      canUsePrices: false,
      canStoreImagesLocally: false
    }
  );
});

test("canShowMedia allows only approved public assets from approved image sources", () => {
  assert.equal(
    canShowMedia(
      { status: MediaAssetStatus.approved, usage: MediaAssetUsage.public },
      {
        status: SourceStatus.approved,
        permissions: {
          canUseImages: true
        }
      }
    ),
    true
  );
});

test("canShowMedia blocks candidate assets and sources without image permission", () => {
  assert.equal(
    canShowMedia(
      { status: MediaAssetStatus.candidate, usage: MediaAssetUsage.public },
      {
        status: SourceStatus.approved,
        permissions: {
          canUseImages: true
        }
      }
    ),
    false
  );
  assert.equal(
    canShowMedia(
      { status: MediaAssetStatus.approved, usage: MediaAssetUsage.public },
      {
        status: SourceStatus.approved,
        permissions: {}
      }
    ),
    false
  );
});

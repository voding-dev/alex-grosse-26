/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as about from "../about.js";
import type * as adminAuth from "../adminAuth.js";
import type * as assets from "../assets.js";
import type * as auth from "../auth.js";
import type * as clientProjects from "../clientProjects.js";
import type * as deliveries from "../deliveries.js";
import type * as deliveriesMutations from "../deliveriesMutations.js";
import type * as design from "../design.js";
import type * as designGallery from "../designGallery.js";
import type * as designHeroCarousel from "../designHeroCarousel.js";
import type * as emailMarketing from "../emailMarketing.js";
import type * as feedback from "../feedback.js";
import type * as graphicDesigner from "../graphicDesigner.js";
import type * as graphicDesignerBrandGallery from "../graphicDesignerBrandGallery.js";
import type * as graphicDesignerCategoryGallery from "../graphicDesignerCategoryGallery.js";
import type * as graphicDesignerGraphicGallery from "../graphicDesignerGraphicGallery.js";
import type * as graphicDesignerHeroCarousel from "../graphicDesignerHeroCarousel.js";
import type * as graphicDesignerWindowGallery from "../graphicDesignerWindowGallery.js";
import type * as heroCarousel from "../heroCarousel.js";
import type * as homepage from "../homepage.js";
import type * as landingPageGallery from "../landingPageGallery.js";
import type * as landingPageHeroCarousel from "../landingPageHeroCarousel.js";
import type * as landingPages from "../landingPages.js";
import type * as mediaLibrary from "../mediaLibrary.js";
import type * as mediaLibraryHelpers from "../mediaLibraryHelpers.js";
import type * as pitchDecks from "../pitchDecks.js";
import type * as portfolio from "../portfolio.js";
import type * as portraits from "../portraits.js";
import type * as portraitsGallery from "../portraitsGallery.js";
import type * as portraitsHeroCarousel from "../portraitsHeroCarousel.js";
import type * as projects from "../projects.js";
import type * as qr_codes from "../qr_codes.js";
import type * as scheduling from "../scheduling.js";
import type * as settings from "../settings.js";
import type * as storage from "../storage.js";
import type * as storageMutations from "../storageMutations.js";
import type * as storageQueries from "../storageQueries.js";
import type * as stripe from "../stripe.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  about: typeof about;
  adminAuth: typeof adminAuth;
  assets: typeof assets;
  auth: typeof auth;
  clientProjects: typeof clientProjects;
  deliveries: typeof deliveries;
  deliveriesMutations: typeof deliveriesMutations;
  design: typeof design;
  designGallery: typeof designGallery;
  designHeroCarousel: typeof designHeroCarousel;
  emailMarketing: typeof emailMarketing;
  feedback: typeof feedback;
  graphicDesigner: typeof graphicDesigner;
  graphicDesignerBrandGallery: typeof graphicDesignerBrandGallery;
  graphicDesignerCategoryGallery: typeof graphicDesignerCategoryGallery;
  graphicDesignerGraphicGallery: typeof graphicDesignerGraphicGallery;
  graphicDesignerHeroCarousel: typeof graphicDesignerHeroCarousel;
  graphicDesignerWindowGallery: typeof graphicDesignerWindowGallery;
  heroCarousel: typeof heroCarousel;
  homepage: typeof homepage;
  landingPageGallery: typeof landingPageGallery;
  landingPageHeroCarousel: typeof landingPageHeroCarousel;
  landingPages: typeof landingPages;
  mediaLibrary: typeof mediaLibrary;
  mediaLibraryHelpers: typeof mediaLibraryHelpers;
  pitchDecks: typeof pitchDecks;
  portfolio: typeof portfolio;
  portraits: typeof portraits;
  portraitsGallery: typeof portraitsGallery;
  portraitsHeroCarousel: typeof portraitsHeroCarousel;
  projects: typeof projects;
  qr_codes: typeof qr_codes;
  scheduling: typeof scheduling;
  settings: typeof settings;
  storage: typeof storage;
  storageMutations: typeof storageMutations;
  storageQueries: typeof storageQueries;
  stripe: typeof stripe;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};

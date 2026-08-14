import { isHttpError } from '@asgard-js/core';
import { t, type Locale } from '../../i18n';

// F-025 R13 — a volume error reaches the user as a sentence, not as the raw JSON body the backend sent.
//
// The four statuses below are the ones the volume API actually uses to mean something specific, and each
// means a different thing to whoever is looking at a file tree:
//
//   400  the path broke a volume rule (leading slash, `..`, trailing slash)
//   403  the token is valid but not for this volume
//   404  someone else deleted it between the listing and the click
//   409  the destination is occupied — the status `create_only` and an overwrite-less copy/move return
//
// Anything else falls through to a generic message that still carries the status, because a number the
// user can quote is worth more than a reassuring sentence that hides it.

/**
 * Turn any thrown value into a sentence for the explorer's error bar.
 *
 * @param error The caught value — an `HttpError` from the volume client, or anything else.
 * @param locale Catalog locale.
 * @param context Optional operation name already localized, prefixed to the message.
 */
export function volumeErrorMessage(error: unknown, locale: Locale, context?: string): string {
  const detail = describe(error, locale);

  return context ? t(locale, 'sourceSetExplorer.errorWithContext', { context, detail }) : detail;
}

function describe(error: unknown, locale: Locale): string {
  if (isHttpError(error)) {
    switch (error.status) {
      case 400:
        return t(locale, 'sourceSetExplorer.errorBadRequest');
      case 401:
      case 403:
        return t(locale, 'sourceSetExplorer.errorForbidden');
      case 404:
        return t(locale, 'sourceSetExplorer.errorNotFound');
      case 409:
        return t(locale, 'sourceSetExplorer.errorConflict');
      default:
        return t(locale, 'sourceSetExplorer.errorStatus', { status: error.status });
    }
  }

  // `assertVolumePath` throws a plain Error with a message written for a developer, and the volume
  // client throws nothing else. Showing it beats swallowing it: it names the offending path.
  if (error instanceof Error && error.message) return error.message;

  return t(locale, 'sourceSetExplorer.errorUnknown');
}

/** Whether this error is the "destination already exists" 409 — the one `createOnly` is there to raise. */
export function isConflict(error: unknown): boolean {
  return isHttpError(error) && error.status === 409;
}

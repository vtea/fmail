import { redirect } from "react-router";
import { resolveLocaleParam, toLocalePath } from "~/i18n/config";
import type { Route } from "./+types/legacy-page-redirect";

export async function loader({ params, request }: Route.LoaderArgs) {
	const { locale, shouldRedirectToDefault, isInvalid } = resolveLocaleParam(
		params.lang,
	);
	if (isInvalid) {
		throw new Response("Not Found", { status: 404 });
	}

	const url = new URL(request.url);
	const homePath = shouldRedirectToDefault ? "/" : toLocalePath("/", locale);
	throw redirect(`${homePath}${url.search}`, 301);
}

export default function LegacyPageRedirect() {
	return null;
}

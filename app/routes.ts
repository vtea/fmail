import { layout, type RouteConfig, route } from "@react-router/dev/routes";

const mdPages = [
	"terms",
	"temporary-email-24-hours",
	"temporary-email-no-registration",
	"disposable-email-for-verification",
	"temporary-email-for-registration",
	"online-temporary-email",
	"domestic-temporary-email",
	"can-temporary-email-send",
	"smail-vs-smailpro",
];

const retiredPages = ["about", "faq", "privacy"];

export default [
	route("/zh-CN", "routes/locale-zh-cn-redirect.tsx", {
		id: "locale-zh-CN-root",
	}),
	route("/zh-CN/*", "routes/locale-zh-cn-redirect.tsx", {
		id: "locale-zh-CN-splat",
	}),
	route("/zh-cn", "routes/locale-zh-cn-redirect.tsx", {
		id: "locale-zh-cn-root",
	}),
	route("/zh-cn/*", "routes/locale-zh-cn-redirect.tsx", {
		id: "locale-zh-cn-splat",
	}),
	route("/robots.txt", "routes/robots.txt.tsx"),
	route("/sitemap.xml", "routes/sitemap.xml.tsx"),
	layout("routes/layout.tsx", [
		route(":lang?", "routes/home.tsx", { id: "home" }),
		...retiredPages.map((page) =>
			route(`:lang?/${page}`, "routes/legacy-page-redirect.tsx", {
				id: `legacy-${page}`,
			}),
		),
		...mdPages.map((page) =>
			route(`:lang?/${page}`, "routes/md.tsx", { id: `md-${page}` }),
		),
	]),
	route("/api/email/:id", "routes/api.email.ts"),
] satisfies RouteConfig;

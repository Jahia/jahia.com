# Jahia.com Template Set Changelog

## 1.1.9

* Add the editable Partner directory and profile experience while preserving legacy Partner content and contact areas.

## 1.1.8

* Add optional image credits to Hero, Panel, Testimony, and full-page blog images.

## 1.1.7

* Keep resource carousel pagination available while its server-rendered cards hydrate in the browser.

## 1.1.6

* Restore upgrade compatibility for manual resource carousel selections and migrate them to a page-compatible field.

## 1.1.5

* Include resource pages in carousel queries and manual selection, and calculate pagination from the number of visible cards.

## 1.1.4

* Filter the resource carousel by thematic and content-type categories, and allow editors to manually combine blog entries with resource pages.

## 1.1.3

* Restore the resource carousel on existing blog pages and automatically create an editable carousel for every blog entry.

## 1.1.2

* Flush the blog feed fragment when a new blog entry is published. (#123)

* Make the blog resource carousel editable and adapt its filters to the selected mode.

## 1.1.1

* Stop the blog table of contents before the resource carousel

## 1.1.0

* Add resource carousel to blog posts (#118)

## 1.0.8

* Improved mobile render of full page blog entries. (#115)

## 1.0.7

* Removed GTM script and iframe from Layout, use AddStuff instead.

* Guard against `null` categories in listChildren (#107)

## 1.0.6

* Small render fix in partners view

* Remove url rewrite rules

* Workaround for resource agregator bug

* Add loading="lazy" to all images to prevent automatic <link> insertion

## 1.0.5

* Enable style cache busting on live using `AddResources`

## 1.0.4

* Work around Cloudimage bug (one path being a substring of the other in srcset)

* Display page cover in listing. (#101)

* Fallback to meta description in case blog post summary is not set.

* Remove `contain: paint` on `:root` to allow `position: fixed`

## 1.0.3

* Add hidden language links in NavBar for SEO crawlability

## 1.0.2

* Expose Lottie at `<jahia>/modules/jahiacom/dist/assets/lottie.js`

## 1.0.1

* Add support for script\[nonce] for GTM-injected script

## 1.0.0

Initial release (🎉)

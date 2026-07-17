# Jahia.com Template Set Changelog

## 1.0.8

* Improved mobile render of full page blog entries.

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

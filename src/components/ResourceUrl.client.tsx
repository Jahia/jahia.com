import { useEffect } from "react";
import { cleanResourceUrl } from "./resourceSession.js";

export default function ResourceUrl() {
  useEffect(cleanResourceUrl, []);
  return null;
}

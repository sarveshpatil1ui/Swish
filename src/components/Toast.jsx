import React from "react";
import { useSwish } from "../context/SwishContext";
export default function Toast() {
  const { toast } = useSwish();
  return toast ? <div className="toast">{toast}</div> : null;
}
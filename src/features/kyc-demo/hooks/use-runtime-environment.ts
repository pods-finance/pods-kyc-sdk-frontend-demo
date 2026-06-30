"use client";

import { useEffect, useState } from "react";
import { DEMO_ENDPOINTS } from "../domain/status";
import {
  extractDemoRuntimeEnvironment,
  formatSumsubEnvironment,
} from "../domain/session";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/format";
import type { DemoRuntimeEnvironment } from "../types";

export function useRuntimeEnvironment() {
  const [runtimeEnvironment, setRuntimeEnvironment] =
    useState<DemoRuntimeEnvironment | null>(null);
  const [runtimeEnvironmentError, setRuntimeEnvironmentError] =
    useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRuntimeEnvironment() {
      try {
        const payload = await apiRequest(DEMO_ENDPOINTS.demoEnvironment, {
          method: "GET",
        });
        const nextRuntimeEnvironment = extractDemoRuntimeEnvironment(payload);

        if (!nextRuntimeEnvironment) {
          throw new Error("Demo environment response is invalid.");
        }

        if (isMounted) {
          setRuntimeEnvironment(nextRuntimeEnvironment);
          setRuntimeEnvironmentError(null);
        }
      } catch (error) {
        if (isMounted) {
          setRuntimeEnvironmentError(getErrorMessage(error));
        }
      }
    }

    void loadRuntimeEnvironment();

    return () => {
      isMounted = false;
    };
  }, []);

  const runtimeEnvironmentLabel = runtimeEnvironment
    ? `Sumsub ${formatSumsubEnvironment(runtimeEnvironment.sumsubEnvironment)}`
    : "Sumsub env";

  return {
    runtimeEnvironment,
    runtimeEnvironmentError,
    runtimeEnvironmentLabel,
  };
}

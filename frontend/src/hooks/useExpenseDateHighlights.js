import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../utils/api";

const QUERY_START_DATE = "01/01/1970";
const QUERY_END_DATE = "31/12/2999";
const PAGE_LIMIT = 1000;

let cachedDateKeys = null;
let pendingDateFetch = null;

const isValidDate = (value) =>
  value instanceof Date && !Number.isNaN(value.getTime());

export const dateKeyFromDate = (value) => {
  if (!isValidDate(value)) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dateKeyFromRaw = (rawValue) => {
  const parsed = new Date(rawValue);
  return dateKeyFromDate(parsed);
};

const loadDateKeysFromApi = async () => {
  if (cachedDateKeys) {
    return cachedDateKeys;
  }

  if (pendingDateFetch) {
    return pendingDateFetch;
  }

  pendingDateFetch = (async () => {
    const uniqueKeys = new Set();
    let page = 1;

    while (true) {
      const res = await API.get("/expenses", {
        params: {
          startDate: QUERY_START_DATE,
          endDate: QUERY_END_DATE,
          page,
          limit: PAGE_LIMIT
        }
      });

      const rows = Array.isArray(res.data) ? res.data : [];

      rows.forEach((item) => {
        const raw = item?.date || item?.createdAt;
        const key = dateKeyFromRaw(raw);
        if (key) uniqueKeys.add(key);
      });

      if (rows.length < PAGE_LIMIT) {
        break;
      }

      page += 1;
    }

    cachedDateKeys = Array.from(uniqueKeys);
    return cachedDateKeys;
  })().finally(() => {
    pendingDateFetch = null;
  });

  return pendingDateFetch;
};

export const clearExpenseDateHighlightsCache = () => {
  cachedDateKeys = null;
  pendingDateFetch = null;
};

export default function useExpenseDateHighlights() {
  const [dateKeys, setDateKeys] = useState(cachedDateKeys || []);
  const [loading, setLoading] = useState(!cachedDateKeys);

  const refreshExpenseDateHighlights = useCallback(async () => {
    clearExpenseDateHighlightsCache();
    setLoading(true);
    try {
      const keys = await loadDateKeysFromApi();
      setDateKeys(keys);
    } catch (err) {
      console.log("Highlight dates load error:", err);
      setDateKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (cachedDateKeys) {
        setDateKeys(cachedDateKeys);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const keys = await loadDateKeysFromApi();
        if (active) setDateKeys(keys);
      } catch (err) {
        if (active) {
          console.log("Highlight dates load error:", err);
          setDateKeys([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, []);

  const dateKeySet = useMemo(() => new Set(dateKeys), [dateKeys]);

  const hasExpenseOnDate = useCallback(
    (dateValue) => dateKeySet.has(dateKeyFromDate(dateValue)),
    [dateKeySet]
  );

  return {
    loading,
    dateKeys,
    hasExpenseOnDate,
    refreshExpenseDateHighlights
  };
}

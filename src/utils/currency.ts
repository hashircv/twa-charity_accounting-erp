import { isAfter, parseISO } from "date-fns";
import type { Currency, ExchangeRate, Money } from "@/types/domain";

export const getExchangeRateByDate = (
  rates: ExchangeRate[],
  from: Currency,
  to: Currency,
  date: string,
) => {
  if (from === to) return 1;

  const reportDate = parseISO(date);
  const sortedRates = [...rates]
    .filter((rate) => rate.from === from && rate.to === to && !isAfter(parseISO(rate.date), reportDate))
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  return sortedRates[0]?.rate ?? (from === "KWD" && to === "INR" ? 278.45 : 1 / 278.45);
};

export const convertCurrency = (
  originalAmount: number,
  currency: Currency,
  reportDate: string,
  exchangeRates: ExchangeRate[],
): Money => {
  const exchangeRate = getExchangeRateByDate(exchangeRates, currency, "INR", reportDate);

  return {
    originalAmount,
    currency,
    exchangeRate,
    convertedAmount: Number((originalAmount * exchangeRate).toFixed(2)),
  };
};

export const formatCurrency = (amount: number, currency: Currency) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KWD" ? 3 : 0,
  }).format(amount);

export const calculateINRBalance = (items: Money[]) =>
  items.reduce((total, item) => total + item.convertedAmount, 0);

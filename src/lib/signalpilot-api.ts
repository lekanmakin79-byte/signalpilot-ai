const API_BASE_URL =
  process.env.NEXT_PUBLIC_SIGNALPILOT_API_URL ||
  "http://127.0.0.1:8000";

export type MarketQuote = {
  symbol: string;
  price: number;
  change_percent: number;
  direction: "UP" | "DOWN" | "FLAT";
  timestamp?: string;
  error?: string;
};

export type FundamentalFactor = {
  name: string;
  value: number | null;
  direction: "positive" | "negative" | "neutral";
  importance: "low" | "medium" | "high";
  base_currency?: string;
  quote_currency?: string;
  unit?: string;
  current_value?: number | null;
  previous_value?: number | null;
  source_data?: {
    current?: number | null;
    previous?: number | null;
    base_latest?: number | null;
    quote_latest?: number | null;
  };
};

export type FundamentalAnalysis = {
  symbol: string;
  available: boolean;
  score: number | null;
  bias: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  factor_count: number;
  factors: FundamentalFactor[];
  method?: string;
  providers?: string[];
  source_count?: number;
  status?: string;
  updated_at?: string | null;
  message?: string;
  disclaimer: string;
};

export type DescriptiveAnalytics = {
  type: "descriptive";
  symbol: string;
  interval: string;
  data_points: number;
  current_price: number;
  starting_price: number;
  high: number;
  low: number;
  price_change_percent: number;
  average_return_percent: number;
  median_return_percent: number;
  return_volatility_percent: number;
  positive_periods: number;
  negative_periods: number;
  flat_periods: number;
};

export type DiagnosticAnalytics = {
  type: "diagnostic";
  symbol: string;
  interval: string;
  available: boolean;
  reason?: string;
  dominant_direction?: "UP" | "DOWN" | "FLAT";
  positive_period_ratio?: number;
  negative_period_ratio?: number;
  average_return_first_half_percent?: number;
  average_return_second_half_percent?: number;
  return_regime_change_percent?: number;
  maximum_drawdown_percent?: number;
};

export type PredictiveAnalytics = {
  type: "predictive";
  symbol: string;
  interval: string;
  available: boolean;
  reason?: string;
  method?: string;
  lookback_periods?: number;
  recent_average_return_percent?: number;
  recent_return_volatility_percent?: number;
  estimated_next_period_change_percent?: number;
  directional_assessment?: "UP" | "DOWN" | "NEUTRAL";
  confidence?: string;
  disclaimer?: string;
};

export type PrescriptiveAnalytics = {
  type: "prescriptive";
  symbol: string;
  interval: string;
  available: boolean;
  reason?: string;
  recent_average_return_percent?: number;
  recent_volatility_percent?: number;
  environment?: string;
  analytical_recommendation?: string;
  disclaimer?: string;
};

export type DataAnalytics = {
  symbol: string;
  interval: string;
  descriptive: DescriptiveAnalytics;
  diagnostic: DiagnosticAnalytics;
  predictive: PredictiveAnalytics;
  prescriptive: PrescriptiveAnalytics;
};

export type MarketAnalysis = {
  symbol: string;
  interval: string;
  price: number;
  direction: "UP" | "DOWN" | "NEUTRAL";
  confidence: number;
  trend: string;
  momentum: string;
  volatility: string;

  scores: {
    trend: number;
    momentum: number;
    volatility: number;
    directional: number;
  };

  indicators: {
    ema20: number | null;
    ema50: number | null;
    rsi14: number | null;
    macd: {
      macd: number | null;
      signal: number | null;
      histogram: number | null;
    };
    atr14: number | null;
  };

  risk: {
    risk_level: string;
    factors: string[];
  };

  data_points: number;

  quality: SignalQuality;

  ranking: {
    score: number;
    rank: number;
  };

  opportunity: {
    score: number;
    rank: number;
  };

  fundamental: FundamentalAnalysis;

  data_analytics: DataAnalytics;
};

export type AIInterpretation = {
  summary: string;
  market_view: string;
  evidence: string[];
  uncertainty: string;
  risk_commentary: string;
  confidence_note: string;
  educational_note: string;
};

export type AIAnalysisResponse = {
  success: boolean;
  analysis: MarketAnalysis;
  ai: AIInterpretation;
};

export type SignalResult = {
  symbol: string;
  timeframe: string;
  price: number;
  signal_timestamp: string;
  direction: "UP" | "DOWN" | "NEUTRAL";
  confidence: number;
  trend: string;
  momentum: string;
  volatility: string;

  scores: {
    trend: number;
    momentum: number;
    volatility: number;
    directional: number;
  };

  indicators: {
    ema20: number | null;
    ema50: number | null;
    rsi14: number | null;
    macd: {
      macd: number | null;
      signal: number | null;
      histogram: number | null;
    };
    atr14: number | null;
  };

  risk: {
    risk_level: string;
    factors: string[];
  };

  data_points: number;
  explanation: string;
};

export type SignalResponse = {
  success: boolean;
  signal: SignalResult;
};

export type SignalQuality = {
  quality_score: number;
  quality_grade:
    | "EXCEPTIONAL"
    | "STRONG"
    | "GOOD"
    | "MODERATE"
    | "WEAK";

  components: {
    directional_strength: number;
    confidence: number;
    indicator_agreement: number;
    volatility_quality: number;
    risk_quality: number;
  };
};

export type RankedSignal = SignalResult & {
  quality: SignalQuality;

  ranking: {
    score: number;
    rank: number;
  };
};

export type SignalRankingResponse = {
  success: boolean;
  interval: string;
  data_points: number;
  count: number;
  signals: RankedSignal[];
};

async function fetchBackend<T>(
  endpoint: string,
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `SignalPilot API error: ${response.status}`,
    );
  }

  return response.json();
}

export async function getSignalRanking(
  interval = "5m",
  limit = 100,
): Promise<SignalRankingResponse> {
  return fetchBackend(
    `/signals/ranking?interval=${encodeURIComponent(
      interval,
    )}&limit=${limit}`,
  );
}

export async function getMarketQuotes(): Promise<{
  success: boolean;
  markets: MarketQuote[];
}> {
  return fetchBackend("/markets/");
}

export async function getAIAnalysis(
  symbol: string,
  interval = "5m",
  limit = 100,
): Promise<AIAnalysisResponse> {
  return fetchBackend(
    `/analysis/${encodeURIComponent(symbol)}/ai?interval=${encodeURIComponent(
      interval,
    )}&limit=${limit}`,
  );
}

export async function getSignal(
  symbol: string,
  interval = "5m",
  limit = 100,
): Promise<SignalResponse> {
  return fetchBackend(
    `/signals/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(
      interval,
    )}&limit=${limit}`,
  );
}

export type SignalHistoryItem = {
  id: number;
  symbol: string;
  timeframe: string;
  price: number;
  signal_timestamp: string | null;
  direction: "UP" | "DOWN" | "NEUTRAL";
  confidence: number;
  trend: string;
  momentum: string;
  volatility: string;
  trend_score: number;
  momentum_score: number;
  volatility_score: number;
  directional_score: number;
  ema20: number | null;
  ema50: number | null;
  rsi14: number | null;
  macd: number | null;
  macd_signal: number | null;
  macd_histogram: number | null;
  atr14: number | null;
  risk_level: string;
  explanation: string;
  data_points: number;
  created_at: string;
};

export type SignalHistoryResponse = {
  success: boolean;
  count: number;
  signals: SignalHistoryItem[];
};

export async function getSignalHistory(
  limit = 50,
): Promise<SignalHistoryResponse> {
  return fetchBackend(
    `/history/signals?limit=${limit}`,
  );
}

export type PerformanceSummary = {
  evaluated_signals: number;
  correct: number;
  incorrect: number;
  neutral: number;
  hit_rate: number;
  average_confidence: number;
  average_price_change_percent: number;
};

export type MarketPerformance = {
  market: string;
  evaluated_signals: number;
  correct: number;
  incorrect: number;
  neutral: number;
  average_confidence: number;
  average_price_change_percent: number;
  hit_rate: number;
};

export type TimeframePerformance = {
  timeframe: string;
  evaluated_signals: number;
  correct: number;
  incorrect: number;
  neutral: number;
  average_confidence: number;
  hit_rate: number;
};

export type PerformanceResponse = {
  success: boolean;
  summary: PerformanceSummary;
};

export type MarketPerformanceResponse = {
  success: boolean;
  markets: MarketPerformance[];
};

export type TimeframePerformanceResponse = {
  success: boolean;
  timeframes: TimeframePerformance[];
};

export async function getPerformanceSummary(): Promise<PerformanceResponse> {
  return fetchBackend("/performance/summary");
}

export async function getPerformanceByMarket(): Promise<MarketPerformanceResponse> {
  return fetchBackend("/performance/markets");
}

export async function getPerformanceByTimeframe(): Promise<TimeframePerformanceResponse> {
  return fetchBackend("/performance/timeframes");
}

export type ConfidenceRangePerformance = {
  range: string;
  evaluated_signals: number;
  correct: number;
  incorrect: number;
  neutral: number;
  hit_rate: number;
  average_confidence: number;
};

export type ConfidenceRangePerformanceResponse = {
  success: boolean;
  confidence_ranges: ConfidenceRangePerformance[];
};

export async function getPerformanceByConfidenceRange(): Promise<ConfidenceRangePerformanceResponse> {
  return fetchBackend(
    "/performance/confidence-ranges",
  );
}

export type StrategyLabResult = {
  timestamp: string;
  symbol: string;
  timeframe: string;
  signal_price: number;
  evaluation_price: number;
  direction: "UP" | "DOWN" | "NEUTRAL";
  confidence: number;
  price_change_percent: number;
  outcome: "CORRECT" | "INCORRECT" | "NEUTRAL";
  hypothetical_directional_change_percent: number;
};

export type StrategyLabSummary = {
  symbol: string;
  timeframe: string;
  candles_used: number;
  warmup_candles: number;
  possible_evaluations: number;
  signals_generated: number;
  signals_filtered: number;
  signals_evaluated: number;
  minimum_confidence: number;
  up_signals: number;
  down_signals: number;
  neutral_signals: number;
  correct: number;
  incorrect: number;
  neutral: number;
  hit_rate: number;
  average_confidence: number;
  average_price_change_percent: number;
  cumulative_directional_change_percent: number;
  compounded_directional_return_percent: number;
  best_trade_percent: number;
  worst_trade_percent: number;
  maximum_drawdown_percent: number;
};

export type StrategyLabResponse = {
  success: boolean;
  backtest: StrategyLabSummary;
  results: StrategyLabResult[];
};

export async function runStrategyLabBacktest(
  symbol: string,
  timeframe = "5m",
  limit = 100,
  minimumConfidence = 0,
): Promise<StrategyLabResponse> {
  return fetchBackend(
    `/strategy-lab/backtest?symbol=${encodeURIComponent(
      symbol,
    )}&timeframe=${encodeURIComponent(
      timeframe,
    )}&limit=${limit}&minimum_confidence=${minimumConfidence}`,
  );
}

export type OpportunitySignal = RankedSignal & {
  opportunity: {
    score: number;
    rank: number;
  };
};

export type SignalOpportunitiesResponse = {
  success: boolean;
  interval: string;
  data_points: number;
  count: number;
  opportunities: OpportunitySignal[];
};

export async function getSignalOpportunities(
  interval = "5m",
  limit = 100,
): Promise<SignalOpportunitiesResponse> {
  return fetchBackend(
    `/signals/opportunities?interval=${encodeURIComponent(
      interval,
    )}&limit=${limit}`,
  );
}
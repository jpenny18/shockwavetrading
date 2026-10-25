import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, db as adminDb } from '@/lib/firebase-admin';
import { isVipMetaApiAccount, normalizeVipAccountSize } from '@/lib/vip-accounts';

// For now, we'll use mock data to test the system
// Once MetaAPI connectivity is resolved, we can switch back
const USE_MOCK_DATA = false;

// Import MetaAPI only on server side
const MetaApiClass = USE_MOCK_DATA ? null : require('metaapi.cloud-sdk').default;
const MetaStats = USE_MOCK_DATA ? null : require('metaapi.cloud-sdk').MetaStats;
const RiskManagement = USE_MOCK_DATA ? null : require('metaapi.cloud-sdk').RiskManagement;

// Get the main MetaAPI auth token
const METAAPI_AUTH_TOKEN = process.env.METAAPI_AUTH_TOKEN || 'your-metaapi-auth-token-here';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountId, accountToken, step, isAdmin } = body;
    const accountType = isVipMetaApiAccount({
      accountType: body.accountType,
      accountSize: body.accountSize,
      profitSplit: body.profitSplit
    })
      ? 'vip'
      : body.accountType;
    const accountSize = accountType === 'vip'
      ? normalizeVipAccountSize(body.accountSize)
      : Number(body.accountSize);
    
    console.log('Request body:', { 
      accountId, 
      hasToken: !!accountToken, 
      accountType, 
      accountSize,
      step 
    });
    
    // Validate required parameters
    if (!accountId || !accountToken) {
      return NextResponse.json(
        { error: 'Missing required parameters: accountId and accountToken are required' },
        { status: 400 }
      );
    }
    
    // Determine which auth token to use
    // If accountToken is 'main-token', use the main METAAPI_AUTH_TOKEN
    const authTokenToUse = (accountToken === 'main-token') ? METAAPI_AUTH_TOKEN : accountToken;
    
    console.log('Using auth token:', authTokenToUse === METAAPI_AUTH_TOKEN ? 'main-token' : 'account-specific-token');
    
    // Skip user auth check if admin
    let userId = null;
    if (!isAdmin) {
      // Verify user is authenticated
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const token = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        userId = decodedToken.uid;
        console.log('Authenticated user:', userId);
      } catch (error) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    } else {
      console.log('Admin access - skipping user authentication');
    }

    // Verify user has access to this account
    try {
      // Only check for user's account ownership if not admin
      if (!isAdmin && userId) {
        const accountsRef = adminDb.collection('userMetaApiAccounts');
        const snapshot = await accountsRef
          .where('userId', '==', userId)
          .where('accountId', '==', accountId)
          .get();
        
        if (snapshot.empty) {
          return NextResponse.json({ error: 'Account not found or access denied' }, { status: 403 });
        }

        // Check account status
        const accountDoc = snapshot.docs[0].data();
        const accountStatus = accountDoc.status;
        
        // If account is failed, return cached metrics only
        if (accountStatus === 'failed') {
          console.log('Account is failed, returning cached metrics only');
          
          // Get cached metrics
          const cachedMetricsRef = adminDb.collection('cachedMetrics').doc(accountId);
          const cachedMetricsDoc = await cachedMetricsRef.get();
          
          if (!cachedMetricsDoc.exists) {
            return NextResponse.json({ 
              error: 'No cached metrics available for failed account',
              accountStatus: 'failed'
            }, { status: 404 });
          }
          
          const cachedData = cachedMetricsDoc.data();
          if (!cachedData) {
            return NextResponse.json({ 
              error: 'Invalid cached metrics data',
              accountStatus: 'failed'
            }, { status: 500 });
          }
          
          // Return cached data in the expected format
          return NextResponse.json({
            metrics: {
              balance: cachedData.balance || 0,
              equity: cachedData.equity || 0,
              averageProfit: cachedData.averageProfit || 0,
              averageLoss: cachedData.averageLoss || 0,
              numberOfTrades: cachedData.numberOfTrades || 0,
              wonTrades: cachedData.wonTrades || 0,
              lostTrades: cachedData.lostTrades || 0,
              averageRRR: cachedData.averageRRR || 0,
              lots: cachedData.lots || 0,
              expectancy: cachedData.expectancy || 0,
              winRate: cachedData.winRate || 0,
              profitFactor: cachedData.profitFactor || 0,
              maxDrawdown: cachedData.maxDrawdown || 0,
              dailyDrawdown: cachedData.dailyDrawdown || 0,
              trades: cachedData.numberOfTrades || 0,
              avgRRR: cachedData.averageRRR || 0
            },
            accountInfo: {
              accountId,
              name: cachedData.accountName || 'Failed Account',
              broker: cachedData.broker || 'Unknown',
              server: cachedData.server || 'Unknown',
              balance: cachedData.balance || 0,
              equity: cachedData.equity || 0,
              currency: 'USD',
              leverage: 100,
              type: 'ACCOUNT_TRADE_MODE_DEMO',
              platform: accountDoc.platform || 'mt5',
              state: 'FAILED',
              connectionStatus: 'DISCONNECTED'
            },
            trades: cachedData.lastTrades || [],
            equityChart: cachedData.lastEquityChart || [],
            objectives: cachedData.lastObjectives || calculateTradingObjectives(
              {
                balance: cachedData.balance || 0,
                maxDrawdown: cachedData.maxDrawdown || 0,
                dailyDrawdown: cachedData.dailyDrawdown || 0,
                trades: cachedData.numberOfTrades || 0,
                tradingDays: cachedData.tradingDays || 0
              },
              accountType,
              accountSize,
              step || 1,
              undefined,
              undefined,
              undefined,
              undefined,
              cachedData.maxDailyDrawdown // Pass the cached max daily drawdown
            ),
            riskEvents: cachedData.lastRiskEvents || [],
            periodStats: cachedData.lastPeriodStats || [],
            accountStatus: 'failed'
          });
        }
      }
    } catch (error) {
      console.error('Database query error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Use mock data for testing
    if (USE_MOCK_DATA) {
      const mockResponse = generateMockData(accountId, accountType, accountSize, step);
      return NextResponse.json(mockResponse);
    }

    // Real MetaAPI implementation - HYBRID APPROACH
    const metaApi = new MetaApiClass(authTokenToUse);
    const metaStats = new MetaStats(authTokenToUse);
    const riskManagement = new RiskManagement(authTokenToUse);
    
    console.log('MetaAPI initialized with token:', authTokenToUse === METAAPI_AUTH_TOKEN ? 'main-token' : authTokenToUse.substring(0, 20) + '...');
    console.log('Processing request for account:', accountId);

    // Initialize response data
    let accountData = null;
    let tradesData: any[] = [];
    let equityData: any[] = [];
    let riskEvents: any[] = [];
    let periodStats: any[] = [];
    let trackers: any[] = [];
    let metricsFromStats: any = null;

    try {
      // 1. Fetch account info first to ensure connection
      accountData = await fetchAccountInfo(metaApi, accountId);
    } catch (error) {
      console.error('Error fetching account info:', error);
      // Continue with other data fetching
    }

    // 2. Get core metrics using MetaStats (original working approach)
    try {
      const startDate = '2020-01-01 00:00:00.000';
      const endDate = new Date().toISOString().slice(0, 19).replace('T', ' ') + '.000';
      
      console.log(`Fetching MetaStats metrics for account ${accountId}`);
      
      // Fetch metrics using the correct MetaStats API method
      metricsFromStats = await metaStats.getMetrics(accountId);
      console.log('MetaStats metrics received:', {
        balance: metricsFromStats?.balance,
        equity: metricsFromStats?.equity,
        trades: metricsFromStats?.trades,
        profitFactor: metricsFromStats?.profitFactor
      });
    } catch (error: any) {
      console.error('Error fetching MetaStats metrics:', error.message);
      
      // Check if this is a MetaStats API not enabled error
      if (error.message && error.message.includes('metastats API you need enable it')) {
        console.log('MetaStats API is not enabled for this account');
        
        // Return helpful error response for admin
        if (isAdmin) {
          return NextResponse.json({
            error: 'MetaStats API is not enabled for this account',
            solution: 'Please enable MetaStats API in the MetaAPI web UI or recreate the account with MetaStats enabled',
            accountId,
            webUIUrl: `https://app.metaapi.cloud/accounts/${accountId}/enable-account-features`
          }, { status: 400 });
        }
        
        // For non-admin users, provide a more user-friendly message
        return NextResponse.json({
          error: 'Account metrics are currently unavailable. Please contact support.',
          accountStatus: 'configuration_required'
        }, { status: 503 });
      }
    }

    // 3. Fetch trades using MetaStats
    try {
      const startDate = '2020-01-01 00:00:00.000';
      const endDate = new Date().toISOString().slice(0, 19).replace('T', ' ') + '.000';
      
      console.log(`Fetching trades for account ${accountId} from ${startDate} to ${endDate}`);
      
      // Fetch both historical trades and open trades
      const [historicalTrades, openTrades] = await Promise.all([
        metaStats.getAccountTrades(accountId, startDate, endDate).catch(() => []),
        metaStats.getAccountOpenTrades ? metaStats.getAccountOpenTrades(accountId).catch(() => []) : Promise.resolve([])
      ]);
      
      // Combine historical and open trades
      tradesData = [...(historicalTrades || []), ...(openTrades || [])];
      console.log(`Retrieved ${tradesData.length} total trades (${historicalTrades?.length || 0} historical, ${openTrades?.length || 0} open)`);
      
      // Filter out balance operations and non-trading deals
      const beforeFilterCount = tradesData.length;
      tradesData = tradesData.filter((trade: any) => {
        // Check if it's a real trade
        const isRealTrade = trade.type && 
               !trade.type.includes('DEAL_TYPE_BALANCE') &&
               !trade.type.includes('DEAL_TYPE_CREDIT') &&
               !trade.type.includes('DEAL_TYPE_CHARGE') &&
               !trade.type.includes('DEAL_TYPE_CORRECTION') &&
               !trade.type.includes('DEAL_TYPE_BONUS') &&
               !trade.type.includes('DEAL_TYPE_COMMISSION') &&
               trade.symbol; // Must have a symbol to be a real trade
        
        return isRealTrade;
      });
      
      console.log(`Filtered from ${beforeFilterCount} to ${tradesData.length} actual trades`);
    } catch (error: any) {
      console.error('Error fetching trades:', error.message);
    }

    // 4. Fetch equity data using the Risk Management API
    // (MetaStats has no equity chart method - Risk Management is the only source)
    let riskApi = null;
    try {
      riskApi = riskManagement.riskManagementApi;
    } catch (error: any) {
      console.log('Risk Management API not available:', error.message);
    }

    if (riskApi) {
      try {
        equityData = await riskApi.getEquityChart(accountId);
        console.log(`Retrieved ${equityData.length} equity data points from Risk Management API`);
      } catch (riskError: any) {
        console.log('Risk Management equity chart not available:', riskError.message);
      }
    }

    if (riskApi) {
      try {
        // Setup risk trackers for automated monitoring (also migrates wrongly-configured ones)
        trackers = await setupRiskTrackers(riskApi, accountId, accountType, accountSize, step);
        console.log(`Risk tracker setup completed: ${trackers.length} active trackers`);
      } catch (error: any) {
        console.error('Error with risk tracker management:', error.message);
        // Fallback: try to get existing trackers even if setup failed
        try {
          trackers = await riskApi.getTrackers(accountId);
        } catch (fallbackError: any) {
          console.error('Could not retrieve any trackers:', fallbackError.message);
          trackers = [];
        }
      }

      try {
        // Get tracker events (breach notifications).
        // Signature is (startBrokerTime, endBrokerTime, accountId, trackerId, limit) -
        // the account id MUST go in the third slot or we'd get events for ALL accounts.
        riskEvents = await riskApi.getTrackerEvents(undefined, undefined, accountId, undefined, 100);
        console.log(`Retrieved ${riskEvents.length} risk events`);
      } catch (error: any) {
        console.error('Error fetching tracker events:', error.message);
      }
    } else {
      console.log('Risk Management API not available - skipping enhanced features');
    }

    // Classify risk events as daily vs max drawdown using their tracker
    // (the API only reports 'profit' | 'drawdown' as exceededThresholdType)
    const categorizedRiskEvents = categorizeRiskEvents(riskEvents, trackers);

    // Compute per-day statistics from the equity chart + trades
    // (replaces the non-existent riskApi.getPeriodStatistics call)
    periodStats = computeDailyPeriodStats(equityData, tradesData);

    // 6. Validity guard: if BOTH MetaStats and the live account info failed, this
    // refresh produced no usable data. Returning zeros here would overwrite good
    // cached metrics with $0 balance / 0% drawdown, so fail loudly instead.
    const hasStatsData = !!metricsFromStats;
    const hasLiveAccountData = !!accountData && ((accountData.balance ?? 0) > 0 || (accountData.equity ?? 0) > 0);
    if (!hasStatsData && !hasLiveAccountData) {
      console.error(`No usable data for account ${accountId} - refusing to overwrite cached metrics`);
      return NextResponse.json({
        error: 'MetaApi did not return account data (rate limit, deployment or connection issue). Cached metrics were preserved - try again shortly.',
        accountStatus: 'unavailable',
        accountId
      }, { status: 502 });
    }

    // 7. Process and combine data
    // Use MetaStats data as primary source, enhanced by Risk Management where available.
    // Use ?? (not ||) so a legitimate value of 0 is preserved.
    const combinedMetrics = {
      balance: metricsFromStats?.balance ?? accountData?.balance ?? 0,
      equity: metricsFromStats?.equity ?? accountData?.equity ?? 0,
      margin: metricsFromStats?.margin ?? 0,
      freeMargin: metricsFromStats?.freeMargin ?? 0,
      profit: metricsFromStats?.profit ?? 0,
      credit: metricsFromStats?.credit ?? 0,
      trades: metricsFromStats?.trades ?? 0,
      wonTrades: metricsFromStats?.wonTrades ?? 0,
      lostTrades: metricsFromStats?.lostTrades ?? 0,
      averageWin: metricsFromStats?.averageWin ?? 0,
      averageLoss: metricsFromStats?.averageLoss ?? 0,
      expectancy: metricsFromStats?.expectancy ?? 0,
      profitFactor: metricsFromStats?.profitFactor ?? 0,
      absoluteDrawdown: metricsFromStats?.absoluteDrawdown ?? 0,
      maxDrawdown: metricsFromStats?.maxDrawdown ?? 0,
      relativeDrawdown: metricsFromStats?.relativeDrawdown ?? 0,
      lots: metricsFromStats?.lots ?? 0,
      commissions: metricsFromStats?.commissions ?? 0
    };

    // Calculate additional metrics
    const winRate = combinedMetrics.trades > 0 ? (combinedMetrics.wonTrades / combinedMetrics.trades) * 100 : 0;
    const avgRRR = combinedMetrics.averageLoss !== 0 ? Math.abs(combinedMetrics.averageWin / combinedMetrics.averageLoss) : 0;

    // Max drawdown per Shockwave rules, computed from the equity chart:
    // - standard/gauntlet/1-step/funded: static, measured from the initial account balance
    // - instant: trailing, measured from the equity high-water mark
    // Falls back to the MetaStats balance-based figure when no equity data exists.
    const isTrailingMaxDD = accountType === 'instant' && (step || 1) !== 3;
    const ruleBasedMaxDrawdown = calculateMaxDrawdown(equityData, accountSize, isTrailingMaxDD);
    if (ruleBasedMaxDrawdown !== null) {
      combinedMetrics.maxDrawdown = ruleBasedMaxDrawdown;
    }

    // Daily drawdown measured from the START-OF-DAY balance/equity baseline
    // (worst intraday equity dip vs that baseline), per broker-time days.
    const dailyDrawdownStats = calculateDailyDrawdownStats(equityData);
    const calculatedDailyDrawdown = dailyDrawdownStats.maxDailyDrawdown;
    const todayDrawdown = dailyDrawdownStats.todayDrawdown;

    // Calculate trading objectives with enhanced data
    const objectives = calculateTradingObjectives(
      combinedMetrics, 
      accountType, 
      accountSize, 
      step || 1,
      calculatedDailyDrawdown,
      tradesData, 
      categorizedRiskEvents,
      periodStats,
      await getCachedMaxDailyDrawdown(accountId)
    );

    // Format response with hybrid data approach
    const response = {
      metrics: {
        ...combinedMetrics,
        winRate,
        avgRRR,
        dailyDrawdown: calculatedDailyDrawdown,
        todayDrawdown
      },
      accountInfo: accountData || {
        accountId,
        name: 'Unknown Account',
        broker: 'Unknown',
        server: 'Unknown',
        balance: combinedMetrics.balance,
        equity: combinedMetrics.equity,
        currency: 'USD',
        leverage: 100,
        type: 'ACCOUNT_TRADE_MODE_DEMO',
        platform: 'mt5',
        state: 'UNKNOWN',
        connectionStatus: 'UNKNOWN'
      },
      trades: tradesData.map((trade: any) => ({
        id: trade._id || trade.id || `trade_${Date.now()}_${Math.random()}`,
        symbol: trade.symbol || 'Unknown',
        type: mapTradeType(trade.type),
        volume: parseFloat(trade.volume || trade.lots) || 0,
        openPrice: parseFloat(trade.openPrice || trade.priceOpen || trade.price) || 0,
        closePrice: trade.closePrice != null ? parseFloat(trade.closePrice || trade.priceClose) : null,
        profit: parseFloat(trade.profit || trade.gain) || 0,
        openTime: trade.openTime || trade.time || new Date().toISOString(),
        closeTime: trade.closeTime || null,
        commission: parseFloat(trade.commission || trade.commissions) || 0,
        swap: parseFloat(trade.swap || trade.swaps) || 0,
        state: trade.state || (trade.closeTime ? 'closed' : 'opened')
      })),
      equityChart: formatEquityChart(equityData),
      objectives,
      riskEvents: categorizedRiskEvents.map(event => ({
        // TrackerEvent has no id field - build a stable one for alert dedup keys
        id: event.id ?? `${event.trackerId || 'tracker'}_${event.sequenceNumber ?? event.brokerTime}`,
        type: event.category,
        accountId: event.accountId,
        trackerId: event.trackerId,
        sequenceNumber: event.sequenceNumber,
        brokerTime: event.brokerTime,
        absoluteDrawdown: event.absoluteDrawdown,
        relativeDrawdown: event.relativeDrawdown,
        // Expose the resolved category ('drawdown' | 'dailyDrawdown' | 'profit') so
        // existing UI checks for 'dailyDrawdown' keep working
        exceededThresholdType: event.category
      })),
      periodStats: periodStats.map(stat => ({
        period: stat.period,
        startBrokerTime: stat.startBrokerTime,
        endBrokerTime: stat.endBrokerTime,
        initialBalance: stat.initialBalance,
        balance: stat.balance,
        equity: stat.equity,
        maxDrawdown: stat.maxDrawdown,
        maxDailyDrawdown: stat.maxDailyDrawdown,
        profit: stat.profit,
        trades: stat.trades,
        tradingDays: stat.tradingDays
      })),
      trackers: trackers.map(tracker => {
        // Clean object by removing undefined values
        const cleanTracker: any = {
          // SDK trackers expose their id as _id
          id: tracker._id || tracker.id || `tracker_${tracker.name}_${Date.now()}`,
          name: tracker.name || 'Unknown Tracker',
          period: tracker.period || 'day'
        };
        
        // Only add fields if they have actual values
        if (tracker.type !== undefined) cleanTracker.type = tracker.type;
        if (tracker.absoluteDrawdownThreshold !== undefined) cleanTracker.absoluteDrawdownThreshold = tracker.absoluteDrawdownThreshold;
        if (tracker.relativeDrawdownThreshold !== undefined) cleanTracker.relativeDrawdownThreshold = tracker.relativeDrawdownThreshold;
        if (tracker.absoluteProfitThreshold !== undefined) cleanTracker.absoluteProfitThreshold = tracker.absoluteProfitThreshold;
        if (tracker.relativeProfitThreshold !== undefined) cleanTracker.relativeProfitThreshold = tracker.relativeProfitThreshold;
        if (tracker.startBrokerTime !== undefined) cleanTracker.startBrokerTime = tracker.startBrokerTime;
        if (tracker.endBrokerTime !== undefined) cleanTracker.endBrokerTime = tracker.endBrokerTime;
        
        return cleanTracker;
      })
    };
    
    console.log(`Returning ${response.trades.length} trades, ${response.equityChart.length} equity points, ${response.riskEvents.length} risk events`);
    console.log(`Daily Drawdown: ${calculatedDailyDrawdown.toFixed(2)}%, Risk Trackers: ${trackers.length}`);

    // Save enhanced data to Firebase cache
    if (!USE_MOCK_DATA) {
      try {
        // Get existing cached metrics to check for max daily drawdown
        let maxDailyDrawdown = calculatedDailyDrawdown;
        try {
          const existingCached = await adminDb.collection('cachedMetrics').doc(accountId).get();
          if (existingCached.exists) {
            const existingData = existingCached.data();
            // Keep the higher value between current and previously recorded max daily drawdown
            maxDailyDrawdown = Math.max(
              calculatedDailyDrawdown,
              existingData?.maxDailyDrawdown || 0
            );
          }
        } catch (err) {
          // If no existing cache, use current value
          console.log('No existing cache found, using current daily drawdown');
        }
        
        const metricsToCache = {
          accountId,
          balance: response.metrics.balance,
          equity: response.metrics.equity,
          averageProfit: response.metrics.averageWin,
          averageLoss: response.metrics.averageLoss,
          numberOfTrades: response.metrics.trades,
          wonTrades: response.metrics.wonTrades,
          lostTrades: response.metrics.lostTrades,
          averageRRR: response.metrics.avgRRR,
          lots: response.metrics.lots,
          expectancy: response.metrics.expectancy,
          winRate: response.metrics.winRate,
          profitFactor: response.metrics.profitFactor,
          maxDrawdown: response.metrics.maxDrawdown,
          dailyDrawdown: calculatedDailyDrawdown,
          todayDrawdown,
          maxDailyDrawdown,
          currentProfit: response.metrics.profit,
          tradingDays: response.objectives.minTradingDays.current,
          accountName: response.accountInfo.name,
          broker: response.accountInfo.broker,
          server: response.accountInfo.server,
          lastTrades: response.trades,
          lastEquityChart: response.equityChart,
          lastObjectives: response.objectives,
          lastRiskEvents: response.riskEvents,
          lastPeriodStats: response.periodStats,
          lastTrackers: response.trackers,
          lastUpdated: new Date()
        };

        // Merge write: never deletes fields written by other code paths
        await adminDb.collection('cachedMetrics').doc(accountId).set(metricsToCache, { merge: true });
        console.log('Enhanced metrics cached to Firebase for account:', accountId);
        console.log(`Max Daily Drawdown recorded: ${maxDailyDrawdown.toFixed(2)}%, Risk Events: ${response.riskEvents.length}`);
      } catch (cacheError) {
        console.error('Error caching metrics to Firebase:', cacheError);
        // Don't fail the request if caching fails
      }
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

// Enhanced function to set up automated risk trackers
function isVipProfitTargetTracker(tracker: any): boolean {
  const name = String(tracker?.name || '').toLowerCase();
  if (name.includes('profit')) return true;
  const hasProfitThreshold =
    tracker?.relativeProfitThreshold != null || tracker?.absoluteProfitThreshold != null;
  const hasDrawdownThreshold =
    tracker?.relativeDrawdownThreshold != null || tracker?.absoluteDrawdownThreshold != null;
  return hasProfitThreshold && !hasDrawdownThreshold;
}

function trackerNeedsThresholdUpdate(existing: any, required: any): boolean {
  const existingAbs = Number(existing?.absoluteDrawdownThreshold);
  const requiredAbs = Number(required?.absoluteDrawdownThreshold);
  if (!Number.isFinite(existingAbs) || !Number.isFinite(requiredAbs) || requiredAbs <= 0) {
    return false;
  }
  const tolerance = Math.max(1, requiredAbs * 0.005);
  return Math.abs(existingAbs - requiredAbs) > tolerance;
}

async function setupRiskTrackers(riskApi: any, accountId: string, accountType: 'standard' | 'instant' | '1-step' | 'gauntlet' | 'vip', accountSize: number, step: number = 1) {
  try {
    // Check if riskApi is available
    if (!riskApi) {
      console.log('Risk API not available - cannot set up trackers');
      return [];
    }

    // Get existing trackers
    const existingTrackers = await riskApi.getTrackers(accountId);
    console.log(`Found ${existingTrackers.length} existing trackers`);
    
    // Define the trackers we need based on challenge type and step
    const isFunded = step === 3;
    let targetDrawdown: number;
    let targetDailyDrawdown: number | null;
    
    if (isFunded) {
      // Funded accounts use standard rules
      targetDrawdown = 15;
      targetDailyDrawdown = 8;
    } else if (accountType === '1-step') {
      // New 1-step challenge: 8% max, 4% daily
      targetDrawdown = 8;
      targetDailyDrawdown = 4;
    } else if (accountType === 'gauntlet') {
      // Gauntlet challenge: 15% max, 8% daily (single phase)
      targetDrawdown = 15;
      targetDailyDrawdown = 8;
    } else if (accountType === 'vip') {
      // VIP is a funded allocation: 15% max, 8% daily, no profit target
      targetDrawdown = 15;
      targetDailyDrawdown = 8;
    } else if (accountType === 'instant') {
      // Updated instant: 4% max trailing loss, no daily
      targetDrawdown = 4;
      targetDailyDrawdown = null; // No daily drawdown for instant
    } else {
      // Standard: 15% max, 8% daily
      targetDrawdown = 15;
      targetDailyDrawdown = 8;
    }
    
    // Required trackers using correct NewTracker format.
    // The max/trailing drawdown tracker must use period 'lifetime' - a 'day' period
    // resets every broker day and can never police a whole-challenge drawdown.
    const requiredTrackers: any[] = [
      {
        name: isFunded ? 'Funded Max Drawdown Monitor' : 
              accountType === 'instant' ? 'Trailing Max Loss Monitor' : 'Max Drawdown Monitor',
        period: 'lifetime',
        relativeDrawdownThreshold: targetDrawdown / 100,
        absoluteDrawdownThreshold: Math.round((accountSize * targetDrawdown) / 100)
      }
    ];
    
    // Only add daily drawdown tracker if not instant challenge
    if (targetDailyDrawdown !== null) {
      requiredTrackers.push({
        name: isFunded ? 'Funded Risk Limit Monitor' : 'Daily Drawdown Monitor', 
        period: 'day',
        relativeDrawdownThreshold: targetDailyDrawdown / 100,
        absoluteDrawdownThreshold: Math.round((accountSize * targetDailyDrawdown) / 100)
      });
    }
    
    // Create missing trackers; migrate existing ones whose period or VIP dollar
    // thresholds are wrong (custom VIP sizes like $1.5M must use that size).
    for (const requiredTracker of requiredTrackers) {
      const existingTracker = existingTrackers.find((t: any) => t.name === requiredTracker.name);
      const existingId = existingTracker?._id || existingTracker?.id;
      const periodWrong = !!existingTracker && existingTracker.period !== requiredTracker.period;
      const vipThresholdsWrong = accountType === 'vip'
        && !!existingTracker
        && trackerNeedsThresholdUpdate(existingTracker, requiredTracker);
      
      if (existingTracker && (periodWrong || vipThresholdsWrong)) {
        console.log(`Tracker ${requiredTracker.name} needs update (periodWrong=${periodWrong}, vipThresholdsWrong=${vipThresholdsWrong})`);
        try {
          if (periodWrong) {
            await riskApi.deleteTracker(accountId, existingId);
            await riskApi.createTracker(accountId, requiredTracker);
            console.log(`Successfully migrated tracker: ${requiredTracker.name}`);
          } else {
            try {
              await riskApi.updateTracker(accountId, existingId, {
                absoluteDrawdownThreshold: requiredTracker.absoluteDrawdownThreshold,
                relativeDrawdownThreshold: requiredTracker.relativeDrawdownThreshold
              });
              console.log(`Successfully updated VIP tracker thresholds: ${requiredTracker.name}`);
            } catch (updateError: any) {
              console.log(`updateTracker failed for ${requiredTracker.name}, recreating: ${updateError.message}`);
              await riskApi.deleteTracker(accountId, existingId);
              await riskApi.createTracker(accountId, requiredTracker);
            }
          }
        } catch (migrateError: any) {
          console.error(`Failed to migrate tracker ${requiredTracker.name}:`, migrateError.message);
        }
      } else if (!existingTracker) {
        console.log(`Creating tracker: ${requiredTracker.name}`);
        try {
          await riskApi.createTracker(accountId, requiredTracker);
          console.log(`Successfully created tracker: ${requiredTracker.name}`);
        } catch (createError: any) {
          console.error(`Failed to create tracker ${requiredTracker.name}:`, createError.message);
          // Continue with other trackers even if one fails
        }
      } else {
        console.log(`Tracker already exists: ${requiredTracker.name}`);
      }
    }

    if (accountType === 'vip') {
      const latestTrackers = await riskApi.getTrackers(accountId);
      for (const tracker of latestTrackers) {
        if (!isVipProfitTargetTracker(tracker)) continue;
        const trackerId = tracker._id || tracker.id;
        if (!trackerId) continue;
        try {
          await riskApi.deleteTracker(accountId, trackerId);
          console.log(`Removed VIP profit target tracker: ${tracker.name}`);
        } catch (deleteError: any) {
          console.error(`Failed to remove VIP profit tracker ${tracker.name}:`, deleteError.message);
        }
      }
    }
    
    // Return updated list of trackers
    const updatedTrackers = await riskApi.getTrackers(accountId);
    console.log(`Final tracker count: ${updatedTrackers.length}`);
    return updatedTrackers;
  } catch (error) {
    console.error('Error setting up risk trackers:', error);
    return [];
  }
}

// Classify tracker events as 'dailyDrawdown' | 'drawdown' | 'profit' based on the
// tracker that produced them. The raw API only reports 'profit' | 'drawdown'.
function categorizeRiskEvents(riskEvents: any[], trackers: any[]): any[] {
  if (!riskEvents || riskEvents.length === 0) return [];
  
  const trackerById: { [key: string]: any } = {};
  (trackers || []).forEach((t: any) => {
    const id = t._id || t.id;
    if (id) trackerById[id] = t;
  });
  
  const isDailyTrackerName = (name: string) =>
    !!name && (name.includes('Daily Drawdown') || name.includes('Risk Limit'));
  
  return riskEvents.map((event: any) => {
    let category: 'dailyDrawdown' | 'drawdown' | 'profit';
    
    if (event.exceededThresholdType === 'profit') {
      category = 'profit';
    } else {
      const tracker = event.trackerId ? trackerById[event.trackerId] : null;
      if (tracker) {
        category = isDailyTrackerName(tracker.name) ? 'dailyDrawdown' : 'drawdown';
      } else if (event.period === 'lifetime') {
        // Tracker no longer exists - lifetime period means max drawdown
        category = 'drawdown';
      } else {
        // Legacy events: both trackers used 'day' period, fall back to nothing
        // smarter than treating them as max drawdown breaches
        category = 'drawdown';
      }
    }
    
    return {
      ...event,
      sequenceNumber: event.sequenceNumber ?? event.sequencenumber,
      category
    };
  });
}

// Enhanced function to format equity chart data
function formatEquityChart(equityData: any[]): any[] {
  const chartPoints: any[] = [];
  
  equityData.forEach((point: any) => {
    // Handle different data structures from Risk Management API
    if (point.startBrokerTime && point.endBrokerTime) {
      // Add start point
      chartPoints.push({
        date: point.startBrokerTime,
        equity: parseFloat(point.startEquity || point.averageEquity || 0),
        balance: parseFloat(point.startBalance || point.averageBalance || 0)
      });
      
      // Add end point
      chartPoints.push({
        date: point.endBrokerTime,
        equity: parseFloat(point.lastEquity || point.averageEquity || point.equity || 0),
        balance: parseFloat(point.lastBalance || point.averageBalance || point.balance || 0)
      });
    } else {
      // Single point data
      chartPoints.push({
        date: point.brokerTime || point.date || new Date().toISOString(),
        equity: parseFloat(point.equity || point.averageEquity || 0),
        balance: parseFloat(point.balance || point.averageBalance || 0)
      });
    }
  });
  
  // Sort by date and filter out invalid points
  return chartPoints
    .filter((point: any) => point.equity > 0 || point.balance > 0)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

async function fetchAccountInfo(metaApi: any, accountId: string) {
  try {
    const account = await metaApi.metatraderAccountApi.getAccount(accountId);
    
    // First get basic account info from the account object
    const accountData = {
      accountId: account.id,
      name: account.name,
      broker: account.broker || 'Unknown',
      server: account.server || 'Unknown',
      type: account.type,
      platform: account.platform || 'mt5',
      state: account.state,
      connectionStatus: account.connectionStatus,
      // Default values that will be updated if we can connect
      balance: 0,
      equity: 0,
      currency: 'USD',
      leverage: 100
    };
    
    try {
      // Deploy account if needed
      if (account.state !== 'DEPLOYED') {
        console.log(`Deploying account ${accountId}. State: ${account.state}`);
        await account.deploy();
        console.log('Waiting for deployment...');
        // Wait a bit for deployment
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Wait for connection if not connected
      // NOTE: waitConnected takes (timeoutInSeconds, intervalInMilliseconds) as numbers,
      // not an options object. Passing an object made the wait abort immediately.
      if (account.connectionStatus !== 'CONNECTED') {
        console.log(`Waiting for account ${accountId} to connect. Status: ${account.connectionStatus}`);
        await account.waitConnected(30);
      }
      
      // After account is connected, get account information
      // Based on the SDK, we need to create a connection to get real-time data
      const connection = account.getRPCConnection();
      
      try {
        await connection.connect();
        // RPC waitSynchronized takes a plain number of seconds
        await connection.waitSynchronized(10);
        
        // Get account information
        const accountInfo = await connection.getAccountInformation();
        if (accountInfo) {
          accountData.balance = accountInfo.balance || 0;
          accountData.equity = accountInfo.equity || 0;
          accountData.currency = accountInfo.currency || 'USD';
          accountData.leverage = accountInfo.leverage || 100;
          accountData.broker = accountInfo.broker || account.broker || 'Unknown';
          accountData.server = accountInfo.server || account.server || 'Unknown';
        }
        
        // Close connection after getting data
        if (connection.close) {
          connection.close();
        }
      } catch (connectionError: any) {
        console.error('Error with RPC connection:', connectionError.message);
        // Try streaming connection as fallback
        try {
          const streamingConnection = account.getStreamingConnection();
          await streamingConnection.connect();
          await streamingConnection.waitSynchronized({ timeoutInSeconds: 10 });
          
          // Check terminal state for account information
          if (streamingConnection.terminalState && streamingConnection.terminalState.accountInformation) {
            const info = streamingConnection.terminalState.accountInformation;
            accountData.balance = info.balance || 0;
            accountData.equity = info.equity || 0;
            accountData.currency = info.currency || 'USD';
            accountData.leverage = info.leverage || 100;
            accountData.broker = info.broker || account.broker || 'Unknown';
            accountData.server = info.server || account.server || 'Unknown';
          }
          
          if (streamingConnection.close) {
            streamingConnection.close();
          }
        } catch (streamingError: any) {
          console.error('Error with streaming connection:', streamingError.message);
        }
      }
      
    } catch (deploymentError: any) {
      console.error('Error deploying/connecting account:', deploymentError.message);
      // Return the basic account data we have
    }
    
    return accountData;
  } catch (error) {
    console.error('Error fetching account info:', error);
    throw error;
  }
}

// Extract the broker-time day key (YYYY-MM-DD) from a broker time string without
// any timezone conversion. Broker times come as 'YYYY-MM-DD HH:mm:ss[.SSS]'.
function brokerDayKey(brokerTime: any): string | null {
  if (!brokerTime || typeof brokerTime !== 'string' || brokerTime.length < 10) return null;
  return brokerTime.slice(0, 10);
}

// Group equity chart buckets by broker day, sorted chronologically within each day
function groupEquityByBrokerDay(equityData: any[]): { [day: string]: any[] } {
  const days: { [day: string]: any[] } = {};
  (equityData || []).forEach(point => {
    const dayKey = brokerDayKey(point.startBrokerTime) || brokerDayKey(point.endBrokerTime) || brokerDayKey(point.brokerTime);
    if (!dayKey) return;
    if (!days[dayKey]) days[dayKey] = [];
    days[dayKey].push(point);
  });
  Object.values(days).forEach(dayPoints => {
    dayPoints.sort((a, b) => String(a.startBrokerTime || '').localeCompare(String(b.startBrokerTime || '')));
  });
  return days;
}

// Daily drawdown per Shockwave rules: the worst intraday equity dip measured from
// the START-OF-DAY balance/equity baseline (the higher of the two at day open),
// using broker-time day boundaries.
// Returns the peak across all days plus today's (latest day's) value.
function calculateDailyDrawdownStats(equityData: any[]): {
  maxDailyDrawdown: number;
  todayDrawdown: number;
  dailyBreakdown: Array<{
    day: string;
    baseline: number;
    minEquity: number;
    drawdown: number;
    startBalance: number;
    startEquity: number;
    lastBalance: number;
    lastEquity: number;
  }>;
} {
  const empty = { maxDailyDrawdown: 0, todayDrawdown: 0, dailyBreakdown: [] as any[] };
  if (!equityData || equityData.length === 0) return empty;
  
  const days = groupEquityByBrokerDay(equityData);
  const dayKeys = Object.keys(days).sort();
  if (dayKeys.length === 0) return empty;
  
  const dailyBreakdown: any[] = [];
  let maxDailyDrawdown = 0;
  
  dayKeys.forEach(dayKey => {
    const dayPoints = days[dayKey];
    const firstPoint = dayPoints[0];
    const lastPoint = dayPoints[dayPoints.length - 1];
    
    const startBalance = Number(firstPoint.startBalance ?? firstPoint.balance ?? 0);
    const startEquity = Number(firstPoint.startEquity ?? firstPoint.equity ?? 0);
    // Start-of-day baseline: the higher of balance/equity at day open
    const baseline = Math.max(startBalance, startEquity);
    
    // Worst equity point of the day (minEquity captures intraday dips inside a bucket)
    let minEquity = Infinity;
    dayPoints.forEach(point => {
      const candidates = [point.minEquity, point.lastEquity, point.equity]
        .map(v => Number(v))
        .filter(v => Number.isFinite(v) && v > 0);
      if (candidates.length > 0) {
        minEquity = Math.min(minEquity, Math.min(...candidates));
      }
    });
    if (!Number.isFinite(minEquity)) minEquity = baseline;
    
    const drawdown = baseline > 0 ? Math.max(0, ((baseline - minEquity) / baseline) * 100) : 0;
    maxDailyDrawdown = Math.max(maxDailyDrawdown, drawdown);
    
    dailyBreakdown.push({
      day: dayKey,
      baseline,
      minEquity,
      drawdown,
      startBalance,
      startEquity,
      lastBalance: Number(lastPoint.lastBalance ?? lastPoint.balance ?? startBalance),
      lastEquity: Number(lastPoint.lastEquity ?? lastPoint.equity ?? startEquity)
    });
  });
  
  return {
    maxDailyDrawdown,
    todayDrawdown: dailyBreakdown[dailyBreakdown.length - 1]?.drawdown ?? 0,
    dailyBreakdown
  };
}

// Max drawdown per Shockwave rules, computed from the equity chart.
// - static (standard/gauntlet/1-step/funded): % below the INITIAL account balance
//   reached by the lowest equity point over the whole history
// - trailing (instant): worst % dip from the running equity high-water mark
// Returns null when there is no equity data (caller falls back to MetaStats).
function calculateMaxDrawdown(equityData: any[], accountStartBalance: number, trailing: boolean): number | null {
  if (!equityData || equityData.length === 0) return null;
  
  const sorted = [...equityData].sort((a, b) =>
    String(a.startBrokerTime || '').localeCompare(String(b.startBrokerTime || '')));
  
  const pointMinEquity = (point: any): number | null => {
    const candidates = [point.minEquity, point.lastEquity, point.equity]
      .map(v => Number(v))
      .filter(v => Number.isFinite(v) && v > 0);
    return candidates.length > 0 ? Math.min(...candidates) : null;
  };
  const pointMaxEquity = (point: any): number | null => {
    const candidates = [point.maxEquity, point.lastEquity, point.equity]
      .map(v => Number(v))
      .filter(v => Number.isFinite(v) && v > 0);
    return candidates.length > 0 ? Math.max(...candidates) : null;
  };
  
  if (trailing) {
    let peak = 0;
    let maxDD = 0;
    sorted.forEach(point => {
      const high = pointMaxEquity(point);
      if (high !== null) peak = Math.max(peak, high);
      const low = pointMinEquity(point);
      if (low !== null && peak > 0) {
        maxDD = Math.max(maxDD, ((peak - low) / peak) * 100);
      }
    });
    return maxDD;
  }
  
  // Static: measured from the initial account balance
  if (!accountStartBalance || accountStartBalance <= 0) return null;
  let lowestEquity = Infinity;
  sorted.forEach(point => {
    const low = pointMinEquity(point);
    if (low !== null) lowestEquity = Math.min(lowestEquity, low);
  });
  if (!Number.isFinite(lowestEquity)) return null;
  return Math.max(0, ((accountStartBalance - lowestEquity) / accountStartBalance) * 100);
}

// Build per-day statistics from the equity chart + trade history.
// This replaces the previous riskApi.getPeriodStatistics call, which does not
// exist in the SDK (the method is getTrackingStatistics and has different fields).
function computeDailyPeriodStats(equityData: any[], tradesData: any[]): any[] {
  const { dailyBreakdown } = calculateDailyDrawdownStats(equityData);
  if (dailyBreakdown.length === 0) return [];
  
  // Count trades per broker day
  const tradesPerDay: { [day: string]: number } = {};
  (tradesData || []).forEach(trade => {
    const dayKey = brokerDayKey(trade.openTime || trade.time || trade.date);
    if (dayKey) tradesPerDay[dayKey] = (tradesPerDay[dayKey] || 0) + 1;
  });
  
  return dailyBreakdown.map(day => ({
    period: 'day',
    startBrokerTime: `${day.day} 00:00:00.000`,
    endBrokerTime: `${day.day} 23:59:59.999`,
    initialBalance: day.startBalance,
    balance: day.lastBalance,
    equity: day.lastEquity,
    maxDrawdown: day.drawdown,
    maxDailyDrawdown: day.drawdown,
    profit: day.lastBalance - day.startBalance,
    trades: tradesPerDay[day.day] || 0,
    tradingDays: (tradesPerDay[day.day] || 0) > 0 ? 1 : 0
  }));
}

// Helper function to get cached max daily drawdown
async function getCachedMaxDailyDrawdown(accountId: string): Promise<number | undefined> {
  try {
    const cachedDoc = await adminDb.collection('cachedMetrics').doc(accountId).get();
    if (cachedDoc.exists) {
      const data = cachedDoc.data();
      return data?.maxDailyDrawdown;
    }
  } catch (error) {
    console.error('Error fetching cached max daily drawdown:', error);
  }
  return undefined;
}

function calculateTradingObjectives(
  metrics: any,
  challengeType: 'standard' | 'instant' | '1-step' | 'gauntlet' | 'vip',
  accountStartBalance: number,
  step: number = 1,
  currentDailyDrawdown?: number,
  tradesData?: any[],
  riskEvents?: any[],
  periodStats?: any[],
  cachedMaxDailyDrawdown?: number
) {
  const currentBalance = metrics.balance || 0;
  const currentDrawdown = metrics.maxDrawdown || 0;
  
  // Daily drawdown (peak): high-water mark across the freshly calculated
  // start-of-day value, the cached historical peak, and any cached metric values.
  // Never goes down on a refresh with partial data.
  const maxDailyDrawdown = Math.max(
    currentDailyDrawdown ?? 0,
    cachedMaxDailyDrawdown ?? 0,
    metrics.maxDailyDrawdown ?? 0,
    metrics.dailyDrawdown ?? 0
  );
  
  const profitPercentage = accountStartBalance > 0 
    ? ((currentBalance - accountStartBalance) / accountStartBalance) * 100 
    : 0;
  
  const targets = {
    standard: {
      minTradingDays: 5,
      maxDrawdown: 15,
      maxDailyDrawdown: 8,
      profitTargetStep1: 10,
      profitTargetStep2: 5
    },
    instant: {
      minTradingDays: 5,
      maxDrawdown: 4, // Updated: 4% trailing max loss
      maxDailyDrawdown: null, // Updated: No daily drawdown limit
      profitTargetStep1: 12,
      profitTargetStep2: 0
    },
    '1-step': {
      minTradingDays: 5,
      maxDrawdown: 8, // New: 8% max drawdown
      maxDailyDrawdown: 4, // New: 4% daily drawdown
      profitTargetStep1: 10, // New: 10% profit target
      profitTargetStep2: 0 // No step 2 for 1-step challenge
    },
    gauntlet: {
      minTradingDays: 0,
      maxDrawdown: 15, // Gauntlet: 15% max drawdown
      maxDailyDrawdown: 8, // Gauntlet: 8% daily drawdown
      profitTargetStep1: 10, // Gauntlet: 10% profit target (single phase)
      profitTargetStep2: 0 // No step 2 for gauntlet challenge
    },
    vip: {
      minTradingDays: 0,
      maxDrawdown: 15,
      maxDailyDrawdown: 8,
      profitTargetStep1: 0,
      profitTargetStep2: 0
    },
    funded: {
      minTradingDays: 5, // 5 days with 0.5% gain required for payout eligibility
      maxDrawdown: 15,    // 15% max drawdown (same as standard step 1)
      maxDailyDrawdown: 8, // 8% max daily drawdown (same as standard)
      profitTarget: 0,   // No profit target for funded accounts
      maxRiskLimit: 2, // Special rule: violation if daily drawdown > 2% (means risking more than 2%)
      minDailyGain: 0.5 // Minimum 0.5% gain required for a day to count as a trading day
    }
  };
  
  // For funded accounts (step 3), use special rules
  const isFunded = step === 3;
  const target = isFunded ? targets.funded : (targets[challengeType] || targets.standard);
  
  // Trading days: count distinct broker-time days with at least 1 trade,
  // straight from the trade history (no timezone conversion of broker times).
  let tradingDays = 0;
  
  const distinctTradeDays = new Set<string>();
  (tradesData || []).forEach(trade => {
    const dayKey = brokerDayKey(trade.openTime || trade.time || trade.date);
    if (dayKey) distinctTradeDays.add(dayKey);
  });
  
  if (isFunded) {
    // For funded accounts: count days with a 0.5% gain from starting balance
    if (periodStats && periodStats.length > 0) {
      const gainThreshold = accountStartBalance * 0.005; // 0.5% of starting balance
      periodStats.forEach(stat => {
        if ((stat.profit || 0) >= gainThreshold) {
          tradingDays++;
        }
      });
    } else {
      // No daily stats available - keep previously recorded value
      tradingDays = metrics.tradingDays || 0;
    }
  } else if (distinctTradeDays.size > 0) {
    tradingDays = distinctTradeDays.size;
  } else if (periodStats && periodStats.length > 0) {
    tradingDays = periodStats.reduce((sum, stat) => sum + (stat.tradingDays || 0), 0);
  } else if (metrics.tradingDays) {
    // Cached/previously calculated trading days
    tradingDays = metrics.tradingDays;
  } else if (metrics.trades > 0) {
    // Last-resort estimation - assume an average of 2 trades per trading day
    tradingDays = Math.min(Math.floor(metrics.trades / 2), 30);
  }
  
  // Check for recent breaches in risk events
  const recentBreaches = {
    maxDrawdown: false,
    dailyDrawdown: false,
    fundedRiskViolation: false
  };
  
  if (riskEvents && riskEvents.length > 0) {
    const recentEvents = riskEvents.filter(e => {
      const eventTime = new Date(e.brokerTime);
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      return eventTime > dayAgo;
    });
    
    // Events carry a resolved category ('drawdown' | 'dailyDrawdown' | 'profit');
    // fall back to the raw exceededThresholdType for older cached events
    const eventCategory = (e: any) => e.category ?? e.exceededThresholdType;
    
    recentBreaches.maxDrawdown = recentEvents.some(e => eventCategory(e) === 'drawdown');
    recentBreaches.dailyDrawdown = recentEvents.some(e => eventCategory(e) === 'dailyDrawdown');
    
    // For funded accounts, check if daily drawdown went above 2%
    if (isFunded) {
      recentBreaches.fundedRiskViolation = recentEvents.some(e => 
        eventCategory(e) === 'dailyDrawdown' && e.relativeDrawdown > 0.02
      );
    }
  }
  
  // Special handling for funded accounts
  if (isFunded) {
    return {
      minTradingDays: {
        target: target.minTradingDays,
        current: tradingDays,
        passed: tradingDays >= target.minTradingDays // Must have 5 days with 0.5% gain for payout eligibility
      },
      maxDrawdown: {
        target: target.maxDrawdown,
        current: currentDrawdown,
        passed: currentDrawdown <= target.maxDrawdown,
        recentBreach: recentBreaches.maxDrawdown
      },
      maxDailyDrawdown: {
        target: target.maxDailyDrawdown as number, // Funded accounts always have daily drawdown
        current: maxDailyDrawdown,
        passed: maxDailyDrawdown <= (target.maxDailyDrawdown as number), // Must be under 8%
        recentBreach: recentBreaches.dailyDrawdown || recentBreaches.fundedRiskViolation,
        fundedRiskViolation: maxDailyDrawdown > 2 // Risk violation if DD > 2%
      },
      profitTarget: {
        target: 0,
        current: profitPercentage,
        passed: true // No profit target for funded accounts
      },
      fundedStatus: true,
      tradingDaysWithGain: tradingDays, // For funded accounts, this represents days with 0.5% gain
      fundedPayoutEligible: tradingDays >= target.minTradingDays // True when 5+ days with 0.5% gain
    };
  }
  
  // Regular challenge account objectives
  const objectives: any = {
    minTradingDays: {
      target: target.minTradingDays,
      current: tradingDays,
      passed: tradingDays >= target.minTradingDays
    },
    maxDrawdown: {
      target: target.maxDrawdown,
      current: currentDrawdown,
      passed: currentDrawdown <= target.maxDrawdown,
      recentBreach: recentBreaches.maxDrawdown,
      isTrailing: challengeType === 'instant' // Flag for instant challenge trailing loss
    },
    profitTarget: challengeType === 'vip'
      ? {
          target: 0,
          current: profitPercentage,
          passed: true
        }
      : {
          target: step === 2 && 'profitTargetStep2' in target ? target.profitTargetStep2 : ('profitTargetStep1' in target ? target.profitTargetStep1 : 0),
          current: profitPercentage,
          passed: step === 2 && 'profitTargetStep2' in target 
            ? profitPercentage >= target.profitTargetStep2 
            : ('profitTargetStep1' in target ? profitPercentage >= target.profitTargetStep1 : true)
        }
  };
  
  // Only add daily drawdown objective if it exists for this challenge type
  if (target.maxDailyDrawdown !== null) {
    objectives.maxDailyDrawdown = {
      target: target.maxDailyDrawdown,
      current: maxDailyDrawdown,
      passed: maxDailyDrawdown <= target.maxDailyDrawdown,
      recentBreach: recentBreaches.dailyDrawdown
    };
  }
  
  return objectives;
}

function generateMockData(accountId: string, accountType: string, accountSize: number, step: number = 1) {
  const balance = accountSize * 1.05; // 5% profit
  const equity = balance - 150; // Small floating loss
  const trades = 47;
  const wonTrades = 28;
  const lostTrades = 19;
  const winRate = (wonTrades / trades) * 100;
  
  return {
    metrics: {
      balance,
      equity,
      margin: 250,
      freeMargin: equity - 250,
      profit: balance - accountSize,
      credit: 0,
      trades,
      wonTrades,
      lostTrades,
      averageWin: 125.50,
      averageLoss: -65.25,
      expectancy: 35.75,
      profitFactor: 1.85,
      absoluteDrawdown: 450,
      maxDrawdown: 4.5,
      relativeDrawdown: 2.3,
      dailyGrowth: 0.25,
      monthlyGrowth: 5.2,
      lots: 15.75,
      commissions: -125,
      winRate,
      avgRRR: 1.92
    },
    accountInfo: {
      accountId,
      name: 'Shockwave Challenge Account',
      broker: 'MetaQuotes Software Corp.',
      server: 'MetaQuotes-Demo',
      balance,
      equity,
      currency: 'USD',
      leverage: 100,
      type: 'ACCOUNT_TRADE_MODE_DEMO',
      platform: 'mt5',
      state: 'DEPLOYED',
      connectionStatus: 'CONNECTED'
    },
    trades: generateMockTrades(),
    equityChart: generateMockEquityChart(accountSize),
    objectives: calculateMockObjectives(accountType, accountSize, balance, step, [], undefined),
    riskEvents: generateMockRiskEvents(),
    periodStats: generateMockPeriodStats(),
    trackers: generateMockTrackers(accountType, accountSize, step)
  };
}

function generateMockTrades() {
  const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'XAUUSD'];
  const trades = [];
  
  for (let i = 0; i < 20; i++) {
    const isWin = Math.random() > 0.4;
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const type = Math.random() > 0.5 ? 'buy' : 'sell';
    const volume = (Math.random() * 0.5 + 0.1).toFixed(2);
    const openPrice = 1.0500 + Math.random() * 0.01;
    const profit = isWin ? Math.random() * 200 : -(Math.random() * 100);
    
    trades.push({
      id: `trade_${i}`,
      symbol,
      type,
      volume: parseFloat(volume),
      openPrice,
      closePrice: openPrice + (profit > 0 ? 0.001 : -0.0005),
      profit,
      openTime: new Date(Date.now() - i * 3600000).toISOString(),
      closeTime: i < 10 ? new Date(Date.now() - i * 1800000).toISOString() : null,
      commission: -2.5,
      swap: -0.5,
      state: i < 10 ? 'closed' : 'opened'
    });
  }
  
  return trades;
}

function generateMockEquityChart(startBalance: number) {
  const points = [];
  let currentBalance = startBalance;
  let currentEquity = startBalance;
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Simulate gradual growth with some volatility
    const dailyChange = (Math.random() - 0.3) * 0.005 * currentBalance;
    currentBalance += dailyChange;
    currentEquity = currentBalance + (Math.random() - 0.5) * 100;
    
    points.push({
      date: date.toISOString(),
      balance: currentBalance,
      equity: currentEquity
    });
  }
  
  return points;
}

function generateMockRiskEvents() {
  return [
    {
      id: 'event1',
      type: 'warning',
      accountId: 'mock-account',
      sequenceNumber: 1,
      brokerTime: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      absoluteDrawdown: 250,
      relativeDrawdown: 2.5,
      exceededThresholdType: 'drawdown'
    }
  ];
}

function generateMockPeriodStats() {
  const stats = [];
  for (let i = 7; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    stats.push({
      period: 'day',
      startBrokerTime: new Date(date.getTime()).toISOString(),
      endBrokerTime: new Date(date.getTime() + 86400000).toISOString(),
      balance: 10000 + (Math.random() - 0.5) * 500,
      equity: 10000 + (Math.random() - 0.5) * 500,
      maxDrawdown: Math.random() * 3,
      maxDailyDrawdown: Math.random() * 2,
      profit: (Math.random() - 0.5) * 100,
      trades: Math.floor(Math.random() * 5),
      tradingDays: i < 5 ? 1 : 0
    });
  }
  return stats;
}

function generateMockTrackers(accountType: string, accountSize: number, step: number = 1) {
  const isFunded = step === 3;
  
  let maxDD: number;
  let dailyDD: number | null;
  
  if (isFunded) {
    maxDD = 15;
    dailyDD = 8;
  } else if (accountType === '1-step') {
    maxDD = 8;
    dailyDD = 4;
  } else if (accountType === 'gauntlet') {
    maxDD = 15;
    dailyDD = 8;
  } else if (accountType === 'vip') {
    maxDD = 15;
    dailyDD = 8;
  } else if (accountType === 'instant') {
    maxDD = 4;
    dailyDD = null;
  } else {
    maxDD = 15;
    dailyDD = 8;
  }
  
  const trackers: any[] = [
    {
      id: 'tracker_max_dd',
      name: isFunded ? 'Funded Max Drawdown Monitor' : 
            accountType === 'instant' ? 'Trailing Max Loss Monitor' : 'Max Drawdown Monitor',
      period: 'day',
      relativeDrawdownThreshold: maxDD / 100,
      absoluteDrawdownThreshold: Math.round((accountSize * maxDD) / 100)
    }
  ];
  
  if (dailyDD !== null) {
    trackers.push({
      id: 'tracker_daily_dd',
      name: isFunded ? 'Funded Risk Limit Monitor' : 'Daily Drawdown Monitor',
      period: 'day',
      relativeDrawdownThreshold: dailyDD / 100,
      absoluteDrawdownThreshold: Math.round((accountSize * dailyDD) / 100)
    });
  }
  
  return trackers;
}

function calculateMockObjectives(accountType: string, accountSize: number, currentBalance: number, step: number = 1, equityData?: any[], cachedMaxDailyDrawdown?: number) {
  const profitPercent = ((currentBalance - accountSize) / accountSize) * 100;
  const maxDrawdown = 4.5; // Mock value
  const dailyDrawdown = cachedMaxDailyDrawdown || 2.3; // Mock value
  const tradingDays = 12; // Mock value
  
  const isFunded = step === 3;
  
  if (isFunded) {
    return {
      minTradingDays: { target: 5, current: tradingDays, passed: tradingDays >= 5 },
      maxDrawdown: { target: 15, current: maxDrawdown, passed: maxDrawdown <= 15 },
      maxDailyDrawdown: { target: 8, current: dailyDrawdown, passed: dailyDrawdown <= 8 },
      profitTarget: { target: 0, current: profitPercent, passed: true },
      fundedStatus: true,
      tradingDaysWithGain: tradingDays,
      fundedPayoutEligible: tradingDays >= 5
    };
  }
  
  let targets: any = {};
  
  if (accountType === '1-step') {
    targets = {
      minTradingDays: 5,
      maxDrawdown: 8,
      maxDailyDrawdown: 4,
      profitTarget: 10
    };
  } else if (accountType === 'gauntlet') {
    targets = {
      minTradingDays: 0,
      maxDrawdown: 15,
      maxDailyDrawdown: 8,
      profitTarget: 10
    };
  } else if (accountType === 'vip') {
    targets = {
      minTradingDays: 0,
      maxDrawdown: 15,
      maxDailyDrawdown: 8,
      profitTarget: 0
    };
  } else if (accountType === 'instant') {
    targets = {
      minTradingDays: 5,
      maxDrawdown: 4,
      maxDailyDrawdown: null,
      profitTarget: 12
    };
  } else {
    targets = {
      minTradingDays: 5,
      maxDrawdown: 15,
      maxDailyDrawdown: 8,
      profitTarget: step === 1 ? 10 : 5
    };
  }
  
  const objectives: any = {
    minTradingDays: { 
      target: targets.minTradingDays, 
      current: tradingDays, 
      passed: tradingDays >= targets.minTradingDays 
    },
    maxDrawdown: { 
      target: targets.maxDrawdown, 
      current: maxDrawdown, 
      passed: maxDrawdown <= targets.maxDrawdown,
      isTrailing: accountType === 'instant'
    },
    profitTarget: { 
      target: targets.profitTarget, 
      current: profitPercent, 
      passed: accountType === 'vip' || !targets.profitTarget ? true : profitPercent >= targets.profitTarget 
    }
  };
  
  if (targets.maxDailyDrawdown !== null) {
    objectives.maxDailyDrawdown = { 
      target: targets.maxDailyDrawdown, 
      current: dailyDrawdown, 
      passed: dailyDrawdown <= targets.maxDailyDrawdown 
    };
  }
  
  return objectives;
}

function mapTradeType(type: string): 'buy' | 'sell' | 'unknown' {
  if (!type) return 'unknown';
  
  const typeUpper = type.toUpperCase();
  
  // Handle various trade type formats from MetaStats
  if (typeUpper.includes('BUY') || 
      typeUpper.includes('DEAL_TYPE_BUY') || 
      typeUpper === 'DEAL_BUY' ||
      typeUpper === 'BUY_MARKET' ||
      typeUpper === 'BUY_LIMIT' ||
      typeUpper === 'BUY_STOP') {
    return 'buy';
  }
  
  if (typeUpper.includes('SELL') || 
      typeUpper.includes('DEAL_TYPE_SELL') || 
      typeUpper === 'DEAL_SELL' ||
      typeUpper === 'SELL_MARKET' ||
      typeUpper === 'SELL_LIMIT' ||
      typeUpper === 'SELL_STOP') {
    return 'sell';
  }
  
  return 'unknown';
} 
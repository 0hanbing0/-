// ═══════════════════════════════════════
// Point Table Engine
// ═══════════════════════════════════════

function ceil100(n) {
  return Math.ceil(n / 100) * 100
}

function computeBasePoints(han, fu, kiriage) {
  if (han >= 13) return 8000
  if (han >= 11) return 6000
  if (han >= 8) return 4000
  if (han >= 6) return 3000
  if (han >= 5) return 2000

  const raw = fu * Math.pow(2, han + 2)
  if (raw > 2000) return 2000
  if (kiriage && raw >= 1920) return 2000
  return raw
}

function computeHandValues(han, fu, kiriage) {
  const bp = computeBasePoints(han, fu, kiriage)

  const childRon = ceil100(bp * 4)
  const dealerRon = ceil100(bp * 6)

  const childTsumoChildShare = ceil100(bp)
  const childTsumoDealerShare = ceil100(bp * 2)
  const childTsumoTotal = childTsumoChildShare * 2 + childTsumoDealerShare

  const dealerTsumoShare = ceil100(bp * 2)
  const dealerTsumoTotal = dealerTsumoShare * 3

  return {
    han,
    fu,
    basePoints: bp,
    childRon,
    dealerRon,
    childTsumo: {
      total: childTsumoTotal,
      childShare: childTsumoChildShare,
      dealerShare: childTsumoDealerShare
    },
    dealerTsumo: {
      total: dealerTsumoTotal,
      share: dealerTsumoShare
    }
  }
}

const FU_VALUES_RON = [25, 30, 40, 50, 60, 70, 80, 90, 100, 110]
const FU_VALUES_TSUMO = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110]

function generateHands(forTsumo, kiriage) {
  const hands = []
  for (let han = 1; han <= 13; han++) {
    let fuList
    if (han >= 5) {
      fuList = [null]
    } else if (han === 1) {
      fuList = [30, 40, 50, 60, 70, 80, 90, 100, 110]
    } else {
      fuList = forTsumo ? [...FU_VALUES_TSUMO] : [...FU_VALUES_RON]
      if (forTsumo && han === 2) {
        fuList = fuList.filter(f => f !== 25)
      }
    }

    for (const fu of fuList) {
      const h = computeHandValues(han, fu === null ? 30 : fu, kiriage)
      if (fu === null) h.fu = null
      hands.push(h)
    }
  }

  hands.sort((a, b) => {
    const diff = a.childRon - b.childRon
    if (diff !== 0) return diff
    return (a.fu || 99) - (b.fu || 99)
  })
  return hands
}

let RON_HANDS = generateHands(false, true)
let TSUMO_HANDS = generateHands(true, true)
let currentKiriage = true

// ═══════════════════════════════════════
// Scenario Calculator
// ═══════════════════════════════════════

const YKM_LABELS = [null, '役满', '两倍役满', '三倍役满', '四倍役满', '五倍役满', '六倍役满']

function makeMultiYakuman(n) {
  return {
    han: 13,
    fu: null,
    basePoints: 8000 * n,
    childRon: 32000 * n,
    dealerRon: 48000 * n,
    childTsumo: {
      total: 32000 * n,
      childShare: 8000 * n,
      dealerShare: 16000 * n
    },
    dealerTsumo: {
      total: 48000 * n,
      share: 16000 * n
    },
    multiples: n
  }
}

function describeHand(h) {
  if (h.multiples >= 2) return YKM_LABELS[h.multiples]
  if (h.han >= 13) return '役满'
  if (h.han >= 11) return '三倍满'
  if (h.han >= 8) return '倍满'
  if (h.han >= 6) return '跳满'
  if (h.han >= 5) return '满贯'
  if (currentKiriage && h.han === 4 && h.basePoints >= 2000) return '满贯（切上）'
  return h.han + '翻' + h.fu + '符'
}

function findMinRonHand(threshold, isDealer, strict) {
  if (threshold <= 0) {
    const h = RON_HANDS[0]
    return { ...h, easy: true }
  }
  const valueKey = isDealer ? 'dealerRon' : 'childRon'
  for (const h of RON_HANDS) {
    const v = h[valueKey]
    if (strict ? v > threshold : v >= threshold) return h
  }
  for (let n = 2; n <= 6; n++) {
    const v = isDealer ? 48000 * n : 32000 * n
    if (strict ? v > threshold : v >= threshold) return makeMultiYakuman(n)
  }
  return null
}

function findMinTsumoHand(threshold, isDealer, targetIsDealer, strict) {
  if (threshold <= 0) {
    const h = TSUMO_HANDS[0]
    return { ...h, easy: true }
  }

  for (const h of TSUMO_HANDS) {
    let gapChange
    if (isDealer) {
      gapChange = h.dealerTsumo.total + h.dealerTsumo.share
    } else {
      if (targetIsDealer) {
        gapChange = h.childTsumo.total + h.childTsumo.dealerShare
      } else {
        gapChange = h.childTsumo.total + h.childTsumo.childShare
      }
    }
    if (strict ? gapChange > threshold : gapChange >= threshold) return h
  }
  for (let n = 2; n <= 6; n++) {
    let gapChange
    if (isDealer) {
      gapChange = 64000 * n
    } else if (targetIsDealer) {
      gapChange = 48000 * n
    } else {
      gapChange = 40000 * n
    }
    if (strict ? gapChange > threshold : gapChange >= threshold) return makeMultiYakuman(n)
  }
  return null
}

function findMinRonThirdHand(threshold, isDealer, strict) {
  if (threshold <= 0) {
    const h = RON_HANDS[0]
    return { ...h, easy: true }
  }
  const valueKey = isDealer ? 'dealerRon' : 'childRon'
  for (const h of RON_HANDS) {
    const v = h[valueKey]
    if (strict ? v > threshold : v >= threshold) return h
  }
  for (let n = 2; n <= 6; n++) {
    const v = isDealer ? 48000 * n : 32000 * n
    if (strict ? v > threshold : v >= threshold) return makeMultiYakuman(n)
  }
  return null
}

function formatHandValue(h, isDealer) {
  if (!h) return { val: '无法逆转', desc: '役满也无法达成', cls: 'impossible' }
  const v = isDealer ? h.dealerRon : h.childRon
  const easy = h.easy
  const desc = describeHand(h)
  if (easy) {
    return { val: '≥' + v + '点', desc: desc, cls: 'easy-reversal' }
  }
  return { val: v + '点', desc: desc, cls: '' }
}

function formatHandValueTsumo(h, isDealer) {
  if (!h) return { val: '无法逆转', desc: '役满也无法达成', cls: 'impossible' }
  const label = isDealer
    ? h.dealerTsumo.share + 'ALL'
    : h.childTsumo.childShare + ' ' + h.childTsumo.dealerShare
  const easy = h.easy
  const desc = describeHand(h)
  if (easy) {
    return { val: '≥' + label, desc: desc, cls: 'easy-reversal' }
  }
  return { val: label, desc: desc, cls: '' }
}

// ═══════════════════════════════════════
// Main Calculation
// ═══════════════════════════════════════

function getRankedOrder(scores) {
  const indexed = scores.map((s, i) => ({ idx: i, score: s }))
  indexed.sort((a, b) => b.score - a.score || a.idx - b.idx)
  return indexed.map(item => item.idx)
}

function getCurrentRank(scores, idx) {
  const order = getRankedOrder(scores)
  return order.indexOf(idx)
}

function getFinalScore(rawScore, rank, oka, uma) {
  let s = rawScore + uma[rank]
  if (rank === 0) s += oka
  return s
}

function computeResults(state) {
  const { scores, names, dealer, honba, riichi, oka, uma, windLabels } = state
  const B = honba * 300
  const R = riichi

  const rankOrder = getRankedOrder(scores)
  const currentRank = rankOrder.map((_, i) => rankOrder.indexOf(i))

  const results = []

  for (let x = 0; x < 4; x++) {
    const xRank = currentRank[x]
    const xIsDealer = (x === dealer)
    const targets = []

    for (let rank = 0; rank < xRank; rank++) {
      const y = rankOrder[rank]
      const yScore = scores[y]
      const rawGap = yScore - scores[x]

      const newRankX = rank
      const newRankY = Math.min(rank + 1, 3)
      const finalGap = getFinalScore(yScore, newRankY, oka, uma) - getFinalScore(scores[x], newRankX, oka, uma)

      const yIsDealer = (y === dealer)
      const target = {
        targetIdx: y,
        targetName: names[y],
        targetWind: windLabels[y],
        targetRank: rank,
        rawGap: rawGap,
        finalGap: finalGap > 0 ? finalGap : 0,
        scenarios: {}
      }

      const strict = x > y

      // Ron directly
      {
        const t = Math.max(0, (rawGap - R) / 2 - B)
        const h = findMinRonHand(t, xIsDealer, strict)
        target.scenarios.ron = { label: '直击', threshold: t, hand: h, isDealer: xIsDealer }
      }

      // Tsumo
      {
        const t = Math.max(0, rawGap - R - 400 * honba)
        const h = findMinTsumoHand(t, xIsDealer, yIsDealer, strict)
        target.scenarios.tsumo = { label: '自摸', threshold: t, hand: h, isDealer: xIsDealer }
      }

      // Ron third party
      {
        const t = Math.max(0, rawGap - B - R)
        const h = findMinRonThirdHand(t, xIsDealer, strict)
        target.scenarios.ronThird = { label: '旁击', threshold: t, hand: h, isDealer: xIsDealer }
      }

      targets.push(target)
    }

    results.push({
      idx: x,
      name: names[x],
      wind: windLabels[x],
      score: scores[x],
      rank: xRank,
      isDealer: xIsDealer,
      targets
    })
  }

  return results
}

// ═══════════════════════════════════════
// Page
// ═══════════════════════════════════════

const UMA_PRESET_VALUES = [
  [20, 10, -10, -20],
  [30, 10, -10, -30],
  [15, 5, -5, -15],
  [50, 10, -10, -30],
  [10, 5, -5, -10],
  [0, 0, 0, 0],
  null // custom
]

const DEFAULT_SCORES = [25000, 25000, 25000, 25000]
const DEFAULT_NAMES = ['东家', '南家', '西家', '北家']
const WIND_LABELS = ['东家', '南家', '西家', '北家']
const RANK_LABELS = ['1位', '2位', '3位', '4位']

Page({
  data: {
    // Settings
    honba: 0,
    riichiCount: 0,
    riichiPoints: '0',
    umaPresets: ['+20/+10/-10/-20', '+30/+10/-10/-30', '+15/+5/-5/-15', '+50/+10/-10/-30', '+10/+5/-5/-10', '无', '自定义'],
    umaPresetIndex: 1,
    showCustomUma: false,
    customUma: [20, 10, -10, -20],
    startPoints: 25000,
    returnPoints: 25000,
    kiriage: true,

    // Dealer & labels
    dealer: 0,
    windLabels: WIND_LABELS,

    // Players
    players: [],

    // Results
    sortedResults: []
  },

  onLoad() {
    this.initPlayers()
    this.updateAll()
  },

  // ═══════════════════
  // State helpers
  // ═══════════════════

  getState() {
    const d = this.data
    const scores = d.players.map(p => {
      const v = parseInt(p.score)
      return isNaN(v) ? 0 : v
    })
    const names = d.players.map(p => p.name || '')

    let uma
    const preset = UMA_PRESET_VALUES[d.umaPresetIndex]
    if (preset) {
      uma = preset
    } else {
      uma = d.customUma.map(v => parseInt(v) || 0)
    }

    const startPoints = parseInt(d.startPoints) || 25000
    const returnPoints = parseInt(d.returnPoints) || 25000
    const oka = Math.max(0, (returnPoints - startPoints) * 4)
    const riichi = (parseInt(d.riichiCount) || 0) * 1000
    const honba = parseInt(d.honba) || 0

    return {
      scores, names, dealer: d.dealer, honba, riichi, oka, uma, windLabels: WIND_LABELS, kiriage: d.kiriage
    }
  },

  // ═══════════════════
  // Update everything
  // ═══════════════════

  initPlayers() {
    const rankOrder = getRankedOrder(DEFAULT_SCORES)
    const players = []
    for (let i = 0; i < 4; i++) {
      players.push({
        name: DEFAULT_NAMES[i],
        score: DEFAULT_SCORES[i],
        isDealer: i === 0,
        rank: rankOrder.indexOf(i)
      })
    }
    this.setData({ players })
  },

  updateAll() {
    const state = this.getState()

    currentKiriage = state.kiriage
    RON_HANDS = generateHands(false, state.kiriage)
    TSUMO_HANDS = generateHands(true, state.kiriage)

    // Update player cards (ranks, dealer status)
    const rankOrder = getRankedOrder(state.scores)
    const players = this.data.players.map((p, i) => {
      const score = state.scores[i]
      const name = state.names[i]
      return {
        name: name,
        score: score,
        isDealer: i === this.data.dealer,
        rank: rankOrder.indexOf(i)
      }
    })

    // Compute results
    const rawResults = computeResults(state)
    rawResults.sort((a, b) => b.rank - a.rank)

    const sortedResults = rawResults.map(r => {
      const item = {
        idx: r.idx,
        name: r.name,
        wind: r.wind,
        score: r.score,
        scoreText: r.score.toLocaleString(),
        rank: r.rank,
        isDealer: r.isDealer,
        targets: []
      }

      if (r.targets.length === 0) {
        // 1st place
        const minHand = RON_HANDS[0]
        const minDesc = describeHand(minHand)
        item.minRonPts = r.isDealer ? minHand.dealerRon : minHand.childRon
        item.minTsumoPts = r.isDealer
          ? minHand.dealerTsumo.share + 'ALL'
          : minHand.childTsumo.childShare + ' ' + minHand.childTsumo.dealerShare
        item.minHandDesc = minDesc
      } else {
        for (const t of r.targets) {
          const ron = formatHandValue(t.scenarios.ron.hand, t.scenarios.ron.isDealer)
          const tsumo = formatHandValueTsumo(t.scenarios.tsumo.hand, t.scenarios.tsumo.isDealer)
          const third = formatHandValue(t.scenarios.ronThird.hand, t.scenarios.ronThird.isDealer)

          item.targets.push({
            targetIdx: t.targetIdx,
            targetName: t.targetName,
            rankLabel: RANK_LABELS[t.targetRank],
            rawGap: t.rawGap,
            rawGapText: t.rawGap.toLocaleString(),
            ronVal: ron.val,
            ronDesc: ron.desc,
            ronCls: ron.cls,
            tsumoVal: tsumo.val,
            tsumoDesc: tsumo.desc,
            tsumoCls: tsumo.cls,
            thirdVal: third.val,
            thirdDesc: third.desc,
            thirdCls: third.cls
          })
        }
      }
      return item
    })

    const riichiCount = parseInt(this.data.riichiCount) || 0
    this.setData({
      players,
      sortedResults,
      riichiPoints: (riichiCount * 1000).toLocaleString()
    })
  },

  // ═══════════════════
  // Input handlers
  // ═══════════════════

  onHonbaInput(e) {
    this.setData({ honba: parseInt(e.detail.value) || 0 })
    this.updateAll()
  },

  onRiichiInput(e) {
    this.setData({ riichiCount: parseInt(e.detail.value) || 0 })
    this.updateAll()
  },

  onUmaPresetChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      umaPresetIndex: index,
      showCustomUma: index === 6
    })
    this.updateAll()
  },

  onUma0Input(e) { this.setUmaCustom(0, e.detail.value) },
  onUma1Input(e) { this.setUmaCustom(1, e.detail.value) },
  onUma2Input(e) { this.setUmaCustom(2, e.detail.value) },
  onUma3Input(e) { this.setUmaCustom(3, e.detail.value) },

  setUmaCustom(idx, val) {
    const customUma = [...this.data.customUma]
    customUma[idx] = parseInt(val) || 0
    this.setData({ customUma })
    this.updateAll()
  },

  onStartPointsInput(e) {
    this.setData({ startPoints: parseInt(e.detail.value) || 25000 })
    this.updateAll()
  },

  onReturnPointsInput(e) {
    this.setData({ returnPoints: parseInt(e.detail.value) || 25000 })
    this.updateAll()
  },

  onDealerChange(e) {
    this.setData({ dealer: parseInt(e.detail.value) })
    this.updateAll()
  },

  onNameInput(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    const players = [...this.data.players]
    players[index] = { ...players[index], name: e.detail.value }
    this.setData({ players })
    this.updateAll()
  },

  onScoreInput(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    const players = [...this.data.players]
    players[index] = { ...players[index], score: e.detail.value }
    this.setData({ players })
    this.updateAll()
  },

  onKiriageChange(e) {
    this.setData({ kiriage: !!e.detail.value })
    this.updateAll()
  }
})

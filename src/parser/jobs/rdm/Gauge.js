import Color from 'color'
import React, {Fragment} from 'react'
import {Icon, Message} from 'semantic-ui-react'

import TimeLineChart from 'components/ui/TimeLineChart'
import ACTIONS from 'data/ACTIONS'
import JOBS from 'data/JOBS'
import STATUSES from 'data/STATUSES'
import Module from 'parser/core/Module'
import {TieredSuggestion, Suggestion, SEVERITY} from 'parser/core/modules/Suggestions'
import {i18nMark, Trans} from '@lingui/react'
//import {ActionLink} from 'components/ui/DbLink'
//TODO: Should possibly look into different Icons for things in Suggestions

//Mana Gains and Expenditures
const MANA_GAIN = {
	[ACTIONS.VERSTONE.id]: {white: 9, black: 0},
	[ACTIONS.VERFIRE.id]: {white: 0, black: 9},
	[ACTIONS.VERAREO.id]: {white: 11, black: 0},
	[ACTIONS.VERTHUNDER.id]: {white: 0, black: 11},
	[ACTIONS.VERHOLY.id]: {white: 21, black: 0},
	[ACTIONS.VERFLARE.id]: {white: 0, black: 21},
	[ACTIONS.JOLT.id]: {white: 3, black: 3},
	[ACTIONS.JOLT_II.id]: {white: 3, black: 3},
	[ACTIONS.IMPACT.id]: {white: 4, black: 4},
	[ACTIONS.SCATTER.id]: {white: 3, black: 3},
	[ACTIONS.ENCHANTED_RIPOSTE.id]: {white: -30, black: -30},
	[ACTIONS.ENCHANTED_ZWERCHHAU.id]: {white: -25, black: -25},
	[ACTIONS.ENCHANTED_REDOUBLEMENT.id]: {white: -25, black: -25},
	[ACTIONS.ENCHANTED_MOULINET.id]: {white: -30, black: -30},
}

export const SEVERITY_WASTED_MANA = {
	1: SEVERITY.MINOR,
	20: SEVERITY.MEDIUM,
	80: SEVERITY.MAJOR,
}

export const SEVERITY_LOST_MANA = {
	1: SEVERITY.MINOR,
	20: SEVERITY.MEDIUM,
	80: SEVERITY.MAJOR,
}

const MANA_DIFFERENCE_THRESHOLD = 30
const MANA_LOST_DIVISOR = 2
const MANA_CAP = 100
const ENCHANCED_SCATTER_GAIN = 8
const MISSING_HARDCAST_MANA_VALUE = 11
const MANAIFCATION_MULTIPLIER = 2

export default class Gauge extends Module {
		static handle = 'gauge'
		static i18n_id = i18nMark('rdm.gauge.title')
		static dependencies = [
			'combatants',
			'suggestions',
		]

		//Keeps track of our current mana gauge.
		_whiteMana = 0
		_blackMana = 0
		//Keeps track of overall wasted mana
		_whiteManaWasted = 0
		_blackManaWasted = 0

		_whiteManaLostToImbalance = 0
		_blackManaLostToImbalance = 0

		_whiteOverallManaGained = 0
		_blackOverallManaGained = 0

		_missingAreo = false
		_missingThunder = false
		_manaficationUsed = false

		// Chart handling
		_history = {
			white: [],
			black: [],
		}

		constructor(...args) {
			super(...args)

			this.addHook('cast', {by: 'player'}, this._onCast)
			this.addHook('death', {to: 'player'}, this._onDeath)
			this.addHook('complete', this._onComplete)
		}

		_calculateManaImbalance(white, black) {
			if (white && this._blackMana - this._whiteMana > MANA_DIFFERENCE_THRESHOLD) {
				//console.log(`Imbalance White Lost, Current White: ${this._whiteMana} Current Black: ${this._blackMana}`)
				//If we have more than 30 black mana over White, our White gains are halved
				this._whiteManaLostToImbalance += Math.ceil(white/MANA_LOST_DIVISOR)
				white = Math.floor(white/MANA_LOST_DIVISOR)
			}

			if (black && this._whiteMana - this._blackMana > MANA_DIFFERENCE_THRESHOLD) {
				//console.log('Imbalance Black Lost')
				//If we have more than 30 white mana over black, our black gains are halved
				this._blackManaLostToImbalance += Math.ceil(black/MANA_LOST_DIVISOR)
				black = Math.floor(black/MANA_LOST_DIVISOR)
			}
		}

		_calculateManaWasted(white, black) {
			if (this._whiteMana > MANA_CAP) {
				this._whiteManaWasted += this._whiteMana - MANA_CAP
				if (white || black) {
					this._whiteOverallManaGained += (white - (this._whiteMana - MANA_CAP))
				}
				this._whiteMana = MANA_CAP
			} else if (white || black) {
				this._whiteOverallManaGained += white||0
			}

			if (this._blackMana > MANA_CAP) {
				//console.log(`Wasted: ${this._blackMana - MANA_CAP}`)
				this._blackManaWasted += this._blackMana - MANA_CAP
				if (white || black) {
					this._blackOverallManaGained += (black - (this._blackMana - MANA_CAP))
				}
				this._blackMana = MANA_CAP
			} else if (white || black) {
				this._blackOverallManaGained += black||0
			}
		}

		_calculateOverallManaGained(white, black) {
			if (this._whiteMana > MANA_CAP) {
				this._whiteManaWasted += this._whiteMana - MANA_CAP
				if (white || black) {
					this._whiteOverallManaGained += (white - (this._whiteMana - MANA_CAP))
				}
				this._whiteMana = MANA_CAP
			} else if (white || black) {
				this._whiteOverallManaGained += white||0
			}

			if (this._blackMana > MANA_CAP) {
				//console.log(`Wasted: ${this._blackMana - 100}`)
				this._blackManaWasted += this._blackMana - MANA_CAP
				if (white || black) {
					this._blackOverallManaGained += (black - (this._blackMana - MANA_CAP))
				}
				this._blackMana = MANA_CAP
			} else if (white || black) {
				this._blackOverallManaGained += black||0
			}
		}

		_calculateManaFicationManaGained() {
			//console.log(`White: ${this._whiteMana}, Black: ${this._blackMana}`)
			//console.log('manafication')
			this._whiteMana = this._whiteMana * MANAIFCATION_MULTIPLIER
			this._blackMana = this._blackMana * MANAIFCATION_MULTIPLIER
			this._manaficationUsed = true

			//TODO: Fix Handling for Manafication!!!!
			//For now I'm excluding it from waste calculations
			if (this._whiteMana > MANA_CAP) {
				this._whiteMana = MANA_CAP
			}
			if (this._blackMana > MANA_CAP) {
				this._blackMana = MANA_CAP
			}

			//console.log(`White: ${this._whiteMana}, Black: ${this._blackMana}`)
			this._calculateOverallManaGained(this._whiteMana, this._blackMana)
			this._calculateManaWasted(this._whiteMana, this._blackMana)
			this._calculateManaImbalance(this._whiteMana, this._blackMana)
		}

		_pushToGraph() {
			const timestamp = this.parser.currentTimestamp - this.parser.fight.start_time
			this._history.white.push({t: timestamp, y: this._whiteMana})
			this._history.black.push({t: timestamp, y: this._blackMana})
		}

		_onCast(event) {
			const abilityId = event.ability.guid
			//This just lets us determine if we've modified the current Mana numbers at all
			//const isCalculated = false

			//console.log(`White: ${this._whiteMana} Black: ${this._blackMana}`)
			if (abilityId === ACTIONS.MANAFICATION.id) {
				//console.log('Manafication')
				this._calculateManaFicationManaGained()
			} else {
				//Determine if the ability we used should yield any mana gain.
				//console.log(`White: ${this._whiteMana}, Black: ${this._blackMana}`)
				//console.log(`Ability: ${event.ability.name}, timestamp: ${this.parser.formatTimestamp(event.timestamp)}`)
				let {white, black} = MANA_GAIN[abilityId] || {}
				if (white || black) {
					if (abilityId === ACTIONS.SCATTER.id) {
						//Check the Buffs on the player for Enhanced scatter, if so gain goes from 3 to 8
						if (this.combatants.selected.hasStatus(STATUSES.ENHANCED_SCATTER.id)) {
							//console.log('Enhanced Scatter On')
							white = ENCHANCED_SCATTER_GAIN
							black = ENCHANCED_SCATTER_GAIN
						}
					}

					//console.log(`Gain ${white||0} White, Gain ${black||0} Black`)

					if (white || black) {
						this._whiteMana += white
						this._blackMana += black

						//We might be missing events from ACT's capture, so do not allow negatives!
						if (this._whiteMana < 0) {
							this._missingAreo = true
							this._whiteMana = this._manaficationUsed ? MISSING_HARDCAST_MANA_VALUE * MANAIFCATION_MULTIPLIER : MISSING_HARDCAST_MANA_VALUE
						}
						if (this._blackMana < 0) {
							this._missingThunder = true
							this._blackMana = this._manaficationUsed ? MISSING_HARDCAST_MANA_VALUE * MANAIFCATION_MULTIPLIER : MISSING_HARDCAST_MANA_VALUE
							//this._blackMana = 0
						}
					}
					//console.log(`White: ${this._whiteMana}, Black: ${this._blackMana}`)
					this._calculateOverallManaGained(white, black)
					this._calculateManaWasted(white, black)
					this._calculateManaImbalance(white, black)
				}
			}

			if (abilityId in MANA_GAIN || abilityId === ACTIONS.MANAFICATION.id) {
				this._pushToGraph()
			}
		}

		_onDeath() {
			this._whiteMana = 0
			this._blackMana = 0
			this._pushToGraph()
		}

		_onComplete() {
			if (this._missingAreo || this._missingThunder) {
				this.suggestions.add(new Suggestion({
					content: <Fragment>
						<Message warning icon>
							<Icon name="warning sign"/>
							<Trans id="rdm.gauge.suggestions.missing-cast-warning-content">Due to a missing cast at the start of the log, mana calculations might be off.
								Additionally 1 or more finishers might have been incorrectly flagged as wrongly used.</Trans>
						</Message>
					</Fragment>,
					severity: SEVERITY.MAJOR,
					why: <Fragment>
						<Trans id="rdm.gauge.suggetsions.missing-cast-warning-why">You were the first damage event, so it doesn&apos;t log your first cast as cast by you</Trans>
					</Fragment>,
				}))
			}

			this.suggestions.add(new TieredSuggestion({
				icon: ACTIONS.VERHOLY.icon,
				content: <Fragment>
					<Trans id="rdm.gauge.suggestions.white-mana-wasted-content">Ensure you don't overcap your White Mana before a combo, overcapping White Mana indicates your balance was off; and you potentially lost out on Enchanted Combo damage.  You should look to execute at 80/80 or as close to it as possible.</Trans>
				</Fragment>,
				tiers: SEVERITY_WASTED_MANA,
				value: this._whiteManaWasted,
				why: <Fragment>
					<Trans id="rdm.gauge.suggestions.white-mana-wasted-why">You lost {this._whiteManaWasted} White Mana due to capped Gauge resources</Trans>
				</Fragment>,
			}))

			this.suggestions.add(new TieredSuggestion({
				icon: ACTIONS.VERFLARE.icon,
				content: <Fragment>
					<Trans id="rdm.gauge.suggestions.white-mana-lost-content">Ensure you don't allow a difference of more than 30 betwen mana types, you lost white Mana due to Imbalance which reduces your overall mana gain and potentially costs you one or more Enchanted Combos</Trans>
				</Fragment>,
				tiers: SEVERITY_LOST_MANA,
				value: this._whiteManaLostToImbalance,
				why: <Fragment>
					<Trans id="rdm.gauge.suggestions.white-mana-lost-why">You lost {this._whiteManaLostToImbalance} White Mana due to overage of black Mana</Trans>
				</Fragment>,
			}))

			this.suggestions.add(new TieredSuggestion({
				icon: ACTIONS.VERFLARE.icon,
				content: <Fragment>
					<Trans id="rdm.gauge.suggestions.black-mana-wasted-content">Ensure you don't overcap your Black Mana before a combo, overcapping Black Mana indicates your balance was off; and you potentially lost out on Enchanted Combo damage.  You should look to execute at 80/80 or as close to it as possible.</Trans>
				</Fragment>,
				tiers: SEVERITY_WASTED_MANA,
				value: this._blackManaWasted,
				why: <Fragment>
					<Trans id="rdm.gauge.suggestions.black-mana-wasted-why">You lost {this._blackManaWasted} Black Mana due to capped Gauge resources</Trans>
				</Fragment>,
			}))

			this.suggestions.add(new TieredSuggestion({
				icon: ACTIONS.VERFLARE.icon,
				content: <Fragment>
					<Trans id="rdm.gauge.suggestions.black-mana-lost-content">Ensure you don't allow a difference of more than 30 betwen mana types, you lost Black Mana due to Imbalance which reduces your overall mana gain and potentially costs you one or more Enchanted Combos</Trans>
				</Fragment>,
				tiers: SEVERITY_LOST_MANA,
				value: this._blackManaLostToImbalance,
				why: <Fragment>
					<Trans id="rdm.gauge.suggestions.black-mana-lost-why">You lost {this._blackManaLostToImbalance} Black Mana due to overage of White Mana</Trans>
				</Fragment>,
			}))
		}

		output() {
			const whm = Color(JOBS.WHITE_MAGE.colour)
			const blm = Color(JOBS.BLACK_MAGE.colour)

			// Disabling magic numbers for the chart, 'cus it's a chart
			/* eslint-disable no-magic-numbers */
			const data = {
				datasets: [{
					label: 'White Mana',
					data: this._history.white,
					backgroundColor: whm.fade(0.5),
					borderColor: whm.fade(0.2),
					steppedLine: true,
				}, {
					label: 'Black Mana',
					data: this._history.black,
					backgroundColor: blm.fade(0.5),
					borderColor: blm.fade(0.2),
					steppedLine: true,
				}],
			}
			return <TimeLineChart
				data={data}
			/>
			/* eslint-enable no-magic-numbers */
		}

		/**
 		* Get the current White Mana as calculated from the most recent OnCast event
 		*/
		get whiteMana() {
			return this._whiteMana
		}

		/**
		* Get the current Black Mana as calculated from the most recent OnCast event
		*/
		get blackMana() {
			return this._blackMana
		}
}

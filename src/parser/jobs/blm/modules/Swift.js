import ACTIONS from 'data/ACTIONS'
import STATUSES from 'data/STATUSES'
import Module from 'parser/core/Module'
import React from 'react'
import {Trans} from '@lingui/react'
import {SimpleStatistic} from 'parser/core/modules/Statistics'

export default class Swiftcast extends Module {
	static handle = 'swiftcast'
	static dependencies = [
		'cooldownDowntime',
		'statistics',
	]

	_usedSwiftcasts = 0

	constructor(...args) {
		super(...args)
		this.addEventHook('applybuff', {by: 'player', abilityId: STATUSES.SWIFTCAST.id}, this._onGainSwiftcast)
	}

	_onGainSharpcast() {
		this._usedSwiftcasts++
	}

	_onComplete() {
		// Gather the data for actual / expected
		console.logs('hewwo?')
		const expected = this.cooldownDowntime.calculateMaxUsages({cooldowns: [ACTIONS.SWIFTCAST]})
		const actual = this._usedSwiftcasts
		let percent = actual / expected * 100
		if (process.env.NODE_ENV === 'production') {
			percent = Math.min(percent, 100)
		}
		//add a statistic for used sharps
		this.statistics.add(new SimpleStatistic({
			title: <Trans id="blm.swiftcast.statistic.title">Used Sharpcasts</Trans>,
			icon: ACTIONS.SWIFTCAST.icon,
			value: `${actual}/${expected} (${percent.toFixed(1)}%)`,
			info: (
				<Trans id="blm.swiftcast.statistic.info">
					The number of Swiftcasts used versus the number of possible Swiftcast uses. If Swiftcast is not needed for movement or emergency purposes within the next 60s, consider weaving it for an instant longer than GCD cast for a small gain.
				</Trans>
			),
		}))
	}
}

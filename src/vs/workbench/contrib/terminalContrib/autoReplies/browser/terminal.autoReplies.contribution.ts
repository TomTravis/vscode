/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TerminalSettingId, type ITerminalBackend } from '../../../../../platform/terminal/common/terminal.js';
import { registerWorkbenchContribution2, WorkbenchPhase, type IWorkbenchContribution } from '../../../../common/contributions.js';
import { ITerminalInstanceService } from '../../../terminal/browser/terminal.js';
import { TERMINAL_CONFIG_SECTION, type ITerminalConfiguration } from '../../../terminal/common/terminal.js';

// #region Workbench contributions

export class TerminalAutoRepliesContribution extends Disposable implements IWorkbenchContribution {
	static ID = 'terminalAutoReplies';

	constructor(
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@ITerminalInstanceService terminalInstanceService: ITerminalInstanceService
	) {
		super();

		for (const backend of terminalInstanceService.getRegisteredBackends()) {
			this._installListenersOnBackend(backend);
		}
		this._register(terminalInstanceService.onDidRegisterBackend(async e => this._installListenersOnBackend(e)));
	}

	private _installListenersOnBackend(backend: ITerminalBackend): void {
		// Listen for config changes
		const initialConfig = this._configurationService.getValue<ITerminalConfiguration>(TERMINAL_CONFIG_SECTION);
		for (const match of Object.keys(initialConfig.autoReplies)) {
			// Ensure the reply is value
			const reply = initialConfig.autoReplies[match] as string | null;
			if (reply) {
				backend.installAutoReply(match, reply);
			}
		}

		// TODO: move to terminalconfigservice, add affectsConfiguration?
		// TODO: Could simplify update to a single call
		this._register(this._configurationService.onDidChangeConfiguration(async e => {
			if (e.affectsConfiguration(TerminalSettingId.AutoReplies)) {
				backend.uninstallAllAutoReplies();
				const config = this._configurationService.getValue<ITerminalConfiguration>(TERMINAL_CONFIG_SECTION);
				for (const match of Object.keys(config.autoReplies)) {
					// Ensure the reply is value
					const reply = config.autoReplies[match] as string | null;
					if (reply) {
						backend.installAutoReply(match, reply);
					}
				}
			}
		}));
	}
}

registerWorkbenchContribution2(TerminalAutoRepliesContribution.ID, TerminalAutoRepliesContribution, WorkbenchPhase.AfterRestored);

// #endregion Contributions

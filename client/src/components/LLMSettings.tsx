import type { TLLMConfig, TLLMProviderName } from "../lib/llm/types";
import { LLM_CATALOG } from "../constants/llmModels";

type TProps = {
  config: TLLMConfig;
  onUpdateConfig: (patch: Partial<TLLMConfig>) => void;
};

const WARN_DEFAULT = 20;

export const LLMSettings = ({ config, onUpdateConfig }: TProps) => {
  const catalog = LLM_CATALOG[config.provider];
  const isModelInCatalog = catalog.models.some((option) => option.id === config.model);

  const handleProviderChange = (provider: TLLMProviderName) => {
    // Switching provider resets the model to that provider's cheap default and
    // re-arms the consent gate, since consent is destination-specific.
    onUpdateConfig({ provider, model: LLM_CATALOG[provider].defaultModel, consented: false });
  };

  const handleClearKey = () => {
    onUpdateConfig({ apiKey: "", consented: false });
  };

  const toggleWarn = (enabled: boolean) => {
    onUpdateConfig({ warnAfterMessages: enabled ? WARN_DEFAULT : null });
  };

  return (
    <div className="llm-settings">
      <h3 className="llm-settings__title">Ask AI settings</h3>
      <p className="llm-settings__description">
        Bring your own API key. Your key and mood data are sent only to the provider you pick —
        never to our servers.
      </p>

      <label className="llm-settings__field">
        <span className="llm-settings__label">Provider</span>
        <select
          className="llm-settings__control"
          value={config.provider}
          onChange={(event) => handleProviderChange(event.target.value as TLLMProviderName)}
        >
          {Object.values(LLM_CATALOG).map((provider) => (
            <option key={provider.name} value={provider.name}>
              {provider.displayName}
            </option>
          ))}
        </select>
      </label>

      <label className="llm-settings__field">
        <span className="llm-settings__label">Model</span>
        <select
          className="llm-settings__control"
          value={isModelInCatalog ? config.model : ""}
          onChange={(event) => onUpdateConfig({ model: event.target.value })}
        >
          {catalog.models.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
          {!isModelInCatalog && <option value="">Custom: {config.model}</option>}
        </select>
        <input
          className="llm-settings__control"
          type="text"
          value={config.model}
          placeholder="Or type a model name"
          onChange={(event) => onUpdateConfig({ model: event.target.value })}
        />
      </label>

      <label className="llm-settings__field">
        <span className="llm-settings__label">API key</span>
        <input
          className="llm-settings__control"
          type="password"
          autoComplete="off"
          value={config.apiKey}
          placeholder={`Your ${catalog.displayName} API key`}
          onChange={(event) => onUpdateConfig({ apiKey: event.target.value })}
        />
      </label>

      <label className="llm-settings__checkbox">
        <input
          type="checkbox"
          checked={config.includeNotes}
          onChange={(event) => onUpdateConfig({ includeNotes: event.target.checked })}
        />
        <span>
          Include daily notes in what I send
          {config.includeNotes && (
            <em className="llm-settings__caution"> — your written notes are personal data; only enable if you're comfortable sharing them.</em>
          )}
        </span>
      </label>

      <div className="llm-settings__knobs">
        <label className="llm-settings__field llm-settings__field--inline">
          <span className="llm-settings__label">History turns kept</span>
          <input
            className="llm-settings__control llm-settings__control--number"
            type="number"
            min={1}
            max={50}
            value={config.maxHistoryTurns}
            onChange={(event) =>
              onUpdateConfig({ maxHistoryTurns: Math.max(1, Number(event.target.value) || 1) })
            }
          />
        </label>

        <label className="llm-settings__checkbox">
          <input
            type="checkbox"
            checked={config.warnAfterMessages != null}
            onChange={(event) => toggleWarn(event.target.checked)}
          />
          <span>Warn me after N messages</span>
        </label>

        {config.warnAfterMessages != null && (
          <label className="llm-settings__field llm-settings__field--inline">
            <span className="llm-settings__label">Warn after</span>
            <input
              className="llm-settings__control llm-settings__control--number"
              type="number"
              min={1}
              value={config.warnAfterMessages}
              onChange={(event) =>
                onUpdateConfig({ warnAfterMessages: Math.max(1, Number(event.target.value) || 1) })
              }
            />
          </label>
        )}
      </div>

      <label className="llm-settings__consent">
        <input
          type="checkbox"
          checked={config.consented}
          onChange={(event) => onUpdateConfig({ consented: event.target.checked })}
        />
        <span>
          I understand my selected mood data will be sent to {catalog.displayName} using my own API
          key, subject to their{" "}
          <a href={catalog.policyUrl} target="_blank" rel="noreferrer">
            privacy and data-retention terms
          </a>
          .
        </span>
      </label>

      {!(config.consented && config.apiKey) && (
        <p className="llm-settings__gate">Add your API key and accept the notice above to enable Ask AI.</p>
      )}

      {config.apiKey && (
        <button type="button" className="llm-settings__clear" onClick={handleClearKey}>
          Clear key &amp; disconnect
        </button>
      )}
    </div>
  );
};

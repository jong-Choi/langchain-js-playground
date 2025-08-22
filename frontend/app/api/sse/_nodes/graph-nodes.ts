import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
import { AppState } from "./graph-state";
import { agents } from "./agents";
import { AppState as AppStateType } from "./types";

// LangGraph 상태를 AppState로 변환하는 어댑터
function adaptState(state: typeof AppState.State): AppStateType {
  return {
    messages: state.messages || [],
    langs: state.langs as AppStateType["langs"] || [],
    translations: state.translations || {},
  };
}

export const supervisorDecideNode = async (state: typeof AppState.State) => {
  return await agents.supervisor.execute(adaptState(state));
};

export const englishTranslatorNode = async (state: typeof AppState.State) => {
  return await agents.translators.english.execute(adaptState(state));
};

export const koreanTranslatorNode = async (state: typeof AppState.State) => {
  return await agents.translators.korean.execute(adaptState(state));
};

export const chineseTranslatorNode = async (state: typeof AppState.State) => {
  return await agents.translators.chinese.execute(adaptState(state));
};

export const finishAndEmitNode = async (state: typeof AppState.State) => {
  await dispatchCustomEvent("task_completed", { 
    translations: state.translations 
  });
  return state;
};
// Простое in-memory хранилище состояний онбординга
// (для продакшена можно заменить на Redis или хранить в БД)

const sessions = new Map();

export function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, { step: null, data: {} });
  }
  return sessions.get(userId);
}

export function setStep(userId, step) {
  const s = getSession(userId);
  s.step = step;
}

export function setData(userId, key, value) {
  const s = getSession(userId);
  s.data[key] = value;
}

export function getData(userId) {
  return getSession(userId).data;
}

export function clearSession(userId) {
  sessions.delete(userId);
}

export const STEPS = {
  GENDER: "gender",
  AGE:    "age",
  WEIGHT: "weight",
  HEIGHT: "height",
  GOAL:   "goal",
  LEVEL:  "level",
};

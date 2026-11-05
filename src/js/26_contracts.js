// The campaign continues after the prison escape. Existing contract IDs keep
// their records, saves and displayed numbers.
const MAIN_CONTRACTS = ['m2', 'm4', 'm6', 'm7'];
const mainContracts = () => MAIN_CONTRACTS.map(id => STAGES.find(s => s.id === id)).filter(Boolean);
const mainContract = s => MAIN_CONTRACTS.includes(s.id);
const introductoryContract = s => !!(s.openingContract || s.starterContract);
const contractNumber = s => mainContract(s) ? String(MAIN_CONTRACTS.indexOf(s.id) + 1).padStart(2, '0') : s.no;
const evidencePending = () => !!(STAGE.securityEvidence && S.camRoom && S.cameraEvidence && !S.camsOff);
function recordCameraEvidence(c) {
  if (!STAGE.securityEvidence || !S.camRoom || c.search || S.camsOff) return;
  const fresh = !S.cameraEvidence;
  S.cameraEvidence = true; checkObjective();
  if (fresh) toast('신원이 녹화됐다 — 보안실에서 기록을 지워야 탈출할 수 있다', 3, 'warn');
}

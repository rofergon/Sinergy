const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        method: options.method ?? "GET",
        headers: {
            "Content-Type": "application/json",
            ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed for ${path}`);
    }
    return (await response.json());
}
export const api = {
    login(email, password) {
        return request("/auth/login", {
            method: "POST",
            body: { email, password },
        });
    },
    refresh(refreshToken) {
        return request("/auth/refresh", {
            method: "POST",
            body: { refreshToken },
        });
    },
    me(token) {
        return request("/me", { token });
    },
    getCompany(token) {
        return request("/companies/current", { token });
    },
    updateCompany(token, body) {
        return request("/companies/current", { token, method: "PATCH", body });
    },
    listBeneficiaries(token) {
        return request("/beneficiaries", { token });
    },
    createBeneficiary(token, body) {
        return request("/beneficiaries", { token, method: "POST", body });
    },
    updateBeneficiary(token, id, body) {
        return request(`/beneficiaries/${id}`, { token, method: "PATCH", body });
    },
    listCorridors(token) {
        return request("/corridors", { token });
    },
    listBatches(token) {
        return request("/batches", { token });
    },
    getBatch(token, id) {
        return request(`/batches/${id}`, { token });
    },
    createBatch(token, body) {
        return request("/batches", { token, method: "POST", body });
    },
    importBatch(token, name, csv) {
        return request("/batches/import", { token, method: "POST", body: { name, csv } });
    },
    createQuote(token, id) {
        return request(`/batches/${id}/quote`, { token, method: "POST" });
    },
    approveBatch(token, id, comment) {
        return request(`/batches/${id}/approve`, { token, method: "POST", body: { comment } });
    },
    rejectBatch(token, id, comment) {
        return request(`/batches/${id}/reject`, { token, method: "POST", body: { comment } });
    },
    getFundingInstructions(token, id) {
        return request(`/batches/${id}/funding-instructions`, { token });
    },
    recordFunding(token, body) {
        return request("/funding/transactions", { token, method: "POST", body });
    },
    listPayouts(token) {
        return request("/payouts", { token });
    },
    dispatchPayout(token, payoutId) {
        return request(`/payouts/${payoutId}/dispatch`, { token, method: "POST" });
    },
    listExceptions(token) {
        return request("/exceptions", { token });
    },
    resolveException(token, exceptionId) {
        return request(`/exceptions/${exceptionId}/resolve`, { token, method: "PATCH" });
    },
    listComplianceCases(token) {
        return request("/compliance/cases", { token });
    },
    resolveComplianceCase(token, caseId) {
        return request(`/batches/compliance/${caseId}/resolve`, { token, method: "PATCH" });
    },
    getReports(token) {
        return request("/reports/batches", { token });
    },
    getAuditLogs(token, entityId) {
        const query = entityId ? `?entityId=${entityId}` : "";
        return request(`/audit-logs${query}`, { token });
    },
    async bootstrap(token) {
        const [me, company, beneficiaries, corridors, batches, payouts, exceptions, complianceCases, reports] = await Promise.all([
            this.me(token),
            this.getCompany(token),
            this.listBeneficiaries(token),
            this.listCorridors(token),
            this.listBatches(token),
            this.listPayouts(token),
            this.listExceptions(token),
            this.listComplianceCases(token).catch(() => []),
            this.getReports(token),
        ]);
        return { me, company, beneficiaries, corridors, batches, payouts, exceptions, complianceCases, reports };
    },
};

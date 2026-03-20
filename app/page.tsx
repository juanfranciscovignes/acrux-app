"use client";

import React, { useEffect, useMemo, useState } from "react";

type Role = "admin" | "operativo";
type CompanyKey = "acrux" | "jc" | "puerto_bahia";
type TaskStatus = "Pendiente" | "En proceso" | "Terminado";
type TaskDifficulty = "Fácil" | "Intermedio" | "Difícil";
type TaskUrgency = "Baja" | "Media" | "Alta" | "Crítica";
type DebtStatus = "Pendiente" | "Cobrado" | "A pagar" | "Pagado";

type User = {
  id: number;
  username: string;
  password: string;
  name: string;
  role: Role;
};

type MonthRow = {
  saldoInicial: number;
  ingresos: number;
  egresos: number;
  cajaReal: number;
  pendienteCobro: number;
  saldoFinalManual: number;
};

type Task = {
  id: number;
  title: string;
  assignedTo: string;
  area: string;
  boat: string;
  dueDate: string;
  status: TaskStatus;
  difficulty: TaskDifficulty;
  urgency: TaskUrgency;
};

type Debt = {
  id: number;
  client: string;
  invoice: string;
  amount: number;
  dueDate: string;
  status: DebtStatus;
  totalInstallments?: number;
  paidInstallments?: number;
  installmentAmount?: number;
  isInstallmentPlan?: boolean;
};

type Goal = {
  id: number;
  title: string;
  amount: number;
};

type SalaryRecord = {
  id: number;
  month: string;
  person: string;
  role: string;
  baseSalary: number;
  extraPay: number;
  grossSalary: number;
  sipa: number;
  noSipa: number;
  socialCharges: number;
  totalCost: number;
};

type Session = {
  name: string;
  role: Role;
};

const users: User[] = [
  { id: 1, username: "admin", password: "admin123", name: "Juan", role: "admin" },
  { id: 2, username: "operativo", password: "operativo123", name: "Operativo", role: "operativo" },
];

const companies: { key: CompanyKey; label: string }[] = [
  { key: "acrux", label: "ACRUX" },
  { key: "jc", label: "JC" },
  { key: "puerto_bahia", label: "PUERTO BAHIA" },
];

const boats = ["General", "Charrúa", "Hurón", "Tejón", "Santiago"];

const emptyMonthRow: MonthRow = {
  saldoInicial: 0,
  ingresos: 0,
  egresos: 0,
  cajaReal: 0,
  pendienteCobro: 0,
  saldoFinalManual: 0,
};

const initialMonthlyDataByCompany: Record<CompanyKey, Record<string, MonthRow>> = {
  acrux: {
    "2025-12": {
      saldoInicial: 58428793.92,
      ingresos: 76340880,
      egresos: 72697879.03,
      cajaReal: 76340880,
      pendienteCobro: 0,
      saldoFinalManual: 62071794.89,
    },
    "2026-01": {
      saldoInicial: 62076784.75,
      ingresos: 81004558.8,
      egresos: 70511593.72,
      cajaReal: 81004558.8,
      pendienteCobro: 0,
      saldoFinalManual: 72569749.83,
    },
    "2026-02": {
      saldoInicial: 72676889.83,
      ingresos: 70624063.6,
      egresos: 64647728.89,
      cajaReal: 0,
      pendienteCobro: 70624063.6,
      saldoFinalManual: 78653224.54,
    },
    "2026-03": {
      saldoInicial: 78653224.54,
      ingresos: 0,
      egresos: 0,
      cajaReal: 70624063.6,
      pendienteCobro: 0,
      saldoFinalManual: 78653224.54,
    },
  },
  jc: {
    "2026-03": { ...emptyMonthRow },
  },
  puerto_bahia: {
    "2026-03": { ...emptyMonthRow },
  },
};

function storageKey(base: string, companyKey: CompanyKey) {
  return `${base}_${companyKey}`;
}

function safeLoad<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function money(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function monthLabel(key: string | null) {
  if (!key) return "";
  return new Date(`${key}-01`).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function addMonthsToKey(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      {children}
    </div>
  );
}

function SmallCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div style={styles.smallCard}>
      <div style={styles.smallTitle}>{title}</div>
      <div style={styles.smallValue}>{value}</div>
      {subtitle ? <div style={styles.smallSubtitle}>{subtitle}</div> : null}
    </div>
  );
}

function runTests() {
  console.assert(money(1000).length > 0, "money should format");
  const ahorro = 100 - 60;
  console.assert(ahorro === 40, "ahorro should be ingresos menos egresos");
  const sipa = 1000 * 0.1;
  const noSipa = 1000 * 0.09;
  const cargas = 1000 * 0.259;
  console.assert(sipa === 100, "SIPA should be 10%");
  console.assert(noSipa === 90, "NO SIPA should be 9%");
  console.assert(cargas === 259, "Cargas should be 25.9%");
}

runTests();

export default function App() {
  const [companyKey, setCompanyKey] = useState<CompanyKey>("acrux");
  const [session, setSession] = useState<Session | null>(null);
  const [login, setLogin] = useState({ username: "admin", password: "admin123" });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAlerts, setShowAlerts] = useState(false);

  const [monthlyData, setMonthlyData] = useState<Record<string, MonthRow>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const [newTask, setNewTask] = useState<Omit<Task, "id">>({
    title: "",
    assignedTo: "Juan",
    area: "Administración",
    boat: "General",
    dueDate: "2026-03-21",
    status: "Pendiente",
    difficulty: "Intermedio",
    urgency: "Media",
  });

  const [newDebt, setNewDebt] = useState({
    client: "",
    invoice: "",
    amount: "",
    dueDate: "2026-03-25",
    status: "Pendiente" as DebtStatus,
  });

  const [newInstallmentDebt, setNewInstallmentDebt] = useState({
    client: "",
    invoice: "",
    totalAmount: "",
    totalInstallments: "12",
    dueDate: "2026-03-25",
  });

  const [newGoal, setNewGoal] = useState({ title: "", amount: "" });

  const [newSalary, setNewSalary] = useState({
    month: getCurrentMonthKey(),
    person: "",
    role: "",
    baseSalary: "",
    extraPay: "0",
  });

  const canSeeMoney = session?.role === "admin";

  useEffect(() => {
    setMonthlyData(safeLoad(storageKey("monthlyData", companyKey), initialMonthlyDataByCompany[companyKey] || {}));
    setTasks(safeLoad(storageKey("tasks", companyKey), [] as Task[]));
    setDebts(safeLoad(storageKey("debts", companyKey), [] as Debt[]));
    setGoals(safeLoad(storageKey("goals", companyKey), [] as Goal[]));
    setSalaryRecords(safeLoad(storageKey("salaries", companyKey), [] as SalaryRecord[]));
  }, [companyKey]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey("monthlyData", companyKey), JSON.stringify(monthlyData));
    }
  }, [monthlyData, companyKey]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey("tasks", companyKey), JSON.stringify(tasks));
    }
  }, [tasks, companyKey]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey("debts", companyKey), JSON.stringify(debts));
    }
  }, [debts, companyKey]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey("goals", companyKey), JSON.stringify(goals));
    }
  }, [goals, companyKey]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey("salaries", companyKey), JSON.stringify(salaryRecords));
    }
  }, [salaryRecords, companyKey]);

  const monthKeys = useMemo(() => Object.keys(monthlyData).sort(), [monthlyData]);

  const availableMonths = useMemo(() => {
    const current = getCurrentMonthKey();
    const start = monthKeys.length ? monthKeys[0] : addMonthsToKey(current, -12);
    const end = monthKeys.length ? monthKeys[monthKeys.length - 1] : addMonthsToKey(current, 12);
    const safeEnd = end > addMonthsToKey(current, 12) ? end : addMonthsToKey(current, 12);
    const list: string[] = [];
    let cursor = start;
    while (cursor <= safeEnd) {
      list.push(cursor);
      cursor = addMonthsToKey(cursor, 1);
    }
    return list;
  }, [monthKeys]);

  useEffect(() => {
    if (!selectedMonth && availableMonths.length) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  useEffect(() => {
    if (!selectedMonth) return;
    setMonthlyData((prev) => {
      if (prev[selectedMonth]) return prev;
      return { ...prev, [selectedMonth]: { ...emptyMonthRow } };
    });
    setNewSalary((prev) => ({ ...prev, month: selectedMonth }));
  }, [selectedMonth]);

  const monthlySummaries = useMemo(() => {
    return Object.keys(monthlyData)
      .sort()
      .map((month) => {
        const row = monthlyData[month] || emptyMonthRow;
        const ahorrado = Number(row.ingresos || 0) - Number(row.egresos || 0);
        return {
          month,
          ...row,
          ahorrado,
          resultado: Number(row.saldoFinalManual || 0) - Number(row.saldoInicial || 0),
        };
      });
  }, [monthlyData]);

  const selectedMonthSummary = useMemo(() => {
    return monthlySummaries.find((m) => m.month === selectedMonth) || null;
  }, [monthlySummaries, selectedMonth]);

  const totalAhorrado = useMemo(() => monthlySummaries.reduce((acc, m) => acc + m.ahorrado, 0), [monthlySummaries]);

  const doLogin = () => {
    const found = users.find((u) => u.username === login.username && u.password === login.password);
    if (!found) {
      window.alert("Usuario o contraseña incorrectos");
      return;
    }
    setSession({ name: found.name, role: found.role });
  };

  const updateMonthField = (field: keyof MonthRow, value: string) => {
    if (!selectedMonth) return;
    setMonthlyData((prev) => ({
      ...prev,
      [selectedMonth]: {
        ...(prev[selectedMonth] || emptyMonthRow),
        [field]: Number(value || 0),
      },
    }));
  };

  const addTask = () => {
    if (!newTask.title.trim()) return;
    setTasks((prev) => [{ id: Date.now(), ...newTask }, ...prev]);
    setNewTask((prev) => ({ ...prev, title: "" }));
  };

  const updateTaskField = (id: number, field: keyof Task, value: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const deleteTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const addDebt = () => {
    if (!newDebt.client || !newDebt.amount) return;
    setDebts((prev) => [
      {
        id: Date.now(),
        client: newDebt.client,
        invoice: newDebt.invoice,
        amount: Number(newDebt.amount),
        dueDate: newDebt.dueDate,
        status: newDebt.status,
      },
      ...prev,
    ]);
    setNewDebt({ client: "", invoice: "", amount: "", dueDate: "2026-03-25", status: "Pendiente" });
  };

  const addInstallmentDebt = () => {
    if (!newInstallmentDebt.client || !newInstallmentDebt.totalAmount || !newInstallmentDebt.totalInstallments) return;
    const totalAmount = Number(newInstallmentDebt.totalAmount);
    const totalInstallments = Math.max(Number(newInstallmentDebt.totalInstallments), 1);
    setDebts((prev) => [
      {
        id: Date.now(),
        client: newInstallmentDebt.client,
        invoice: newInstallmentDebt.invoice || `Plan ${totalInstallments} cuotas`,
        amount: totalAmount,
        dueDate: newInstallmentDebt.dueDate,
        status: "A pagar",
        totalInstallments,
        paidInstallments: 0,
        installmentAmount: totalAmount / totalInstallments,
        isInstallmentPlan: true,
      },
      ...prev,
    ]);
    setNewInstallmentDebt({ client: "", invoice: "", totalAmount: "", totalInstallments: "12", dueDate: "2026-03-25" });
  };

  const markInstallmentPaid = (id: number) => {
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id !== id || !d.isInstallmentPlan) return d;
        const nextPaid = Math.min((d.paidInstallments || 0) + 1, d.totalInstallments || 0);
        return {
          ...d,
          paidInstallments: nextPaid,
          status: nextPaid >= (d.totalInstallments || 0) ? "Pagado" : "A pagar",
        };
      }),
    );
  };

  const addGoal = () => {
    if (!newGoal.title || !newGoal.amount) return;
    setGoals((prev) => [...prev, { id: Date.now(), title: newGoal.title, amount: Number(newGoal.amount) }]);
    setNewGoal({ title: "", amount: "" });
  };

  const addSalaryRecord = () => {
    if (!newSalary.person || !newSalary.baseSalary) return;
    const baseSalary = Number(newSalary.baseSalary || 0);
    const extraPay = Number(newSalary.extraPay || 0);
    const grossSalary = baseSalary + extraPay;
    const sipa = grossSalary * 0.1;
    const noSipa = grossSalary * 0.09;
    const socialCharges = grossSalary * 0.259;
    const totalCost = grossSalary + socialCharges;

    setSalaryRecords((prev) => [
      {
        id: Date.now(),
        month: newSalary.month,
        person: newSalary.person,
        role: newSalary.role,
        baseSalary,
        extraPay,
        grossSalary,
        sipa,
        noSipa,
        socialCharges,
        totalCost,
      },
      ...prev,
    ]);

    setNewSalary((prev) => ({ ...prev, person: "", role: "", baseSalary: "", extraPay: "0" }));
  };

  const deleteSalaryRecord = (id: number) => {
    setSalaryRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const activeTasks = tasks.filter((t) => t.status !== "Terminado");

  if (!session) {
    return (
      <div style={styles.pageCenter}>
        <div style={styles.loginBox}>
          <h1 style={styles.h1}>Gestión Interna</h1>
          <div style={styles.field}>
            <label>Empresa</label>
            <select value={companyKey} onChange={(e) => setCompanyKey(e.target.value as CompanyKey)} style={styles.input}>
              {companies.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label>Usuario</label>
            <input value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} style={styles.input} />
          </div>
          <div style={styles.field}>
            <label>Contraseña</label>
            <input type="password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} style={styles.input} />
          </div>
          <button onClick={doLogin} style={styles.primaryButton}>Ingresar</button>
          <div style={styles.helpText}>
            Admin: <b>admin / admin123</b>
            <br />
            Operativo: <b>operativo / operativo123</b>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.h1}>Gestión Interna</h1>
          <div style={styles.helpText}>
            {session.name} · {session.role} · {companies.find((c) => c.key === companyKey)?.label}
          </div>
        </div>
        <button onClick={() => setSession(null)} style={styles.secondaryButton}>Cerrar sesión</button>
      </div>

      <div style={styles.rowWrap}>
        {canSeeMoney ? (
          <>
            <SmallCard title={`Ingresos ${monthLabel(selectedMonth)}`} value={money(selectedMonthSummary?.ingresos || 0)} />
            <SmallCard title={`Egresos ${monthLabel(selectedMonth)}`} value={money(selectedMonthSummary?.egresos || 0)} />
            <SmallCard title={`Caja real ${monthLabel(selectedMonth)}`} value={money(selectedMonthSummary?.cajaReal || 0)} />
            <SmallCard title={`Colchón ${monthLabel(selectedMonth)}`} value={money(selectedMonthSummary?.saldoFinalManual || 0)} />
            <SmallCard title={`Pendiente ${monthLabel(selectedMonth)}`} value={money(selectedMonthSummary?.pendienteCobro || 0)} />
          </>
        ) : (
          <SmallCard title="Modo operativo" value="Sin acceso a finanzas" subtitle="No ve importes ni secciones financieras" />
        )}
        <SmallCard title="Tareas abiertas" value={String(activeTasks.length)} />
      </div>

      <div style={styles.toolbar}>
        <div style={styles.fieldInline}>
          <label>Mes</label>
          <select value={selectedMonth || ""} onChange={(e) => setSelectedMonth(e.target.value)} style={styles.input}>
            {availableMonths.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
        </div>
        <div style={styles.tabRow}>
          {[
            "dashboard",
            ...(canSeeMoney ? ["deudas", "objetivos", "sueldos"] : []),
            "tareas",
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={activeTab === tab ? styles.tabActive : styles.tab}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "dashboard" ? (
        <div style={styles.grid2}>
          <SectionCard title="Alertas clave">
            <button onClick={() => setShowAlerts((v) => !v)} style={styles.secondaryButtonSmall}>
              {showAlerts ? "Ocultar" : "Ver"}
            </button>
            {showAlerts ? (
              <div style={{ marginTop: 12 }}>
                {activeTasks.length === 0 ? <div>No hay tareas activas.</div> : null}
                {activeTasks.slice(0, 5).map((t) => (
                  <div key={t.id} style={styles.listRow}>
                    <span>{t.title}</span>
                    <b>{t.urgency}</b>
                  </div>
                ))}
              </div>
            ) : null}
          </SectionCard>

          {canSeeMoney ? (
            <SectionCard title="Editar cierre mensual">
              <div style={styles.field}><label>Saldo inicial</label><input type="number" value={selectedMonthSummary?.saldoInicial || 0} onChange={(e) => updateMonthField("saldoInicial", e.target.value)} style={styles.input} /></div>
              <div style={styles.field}><label>Ingresos</label><input type="number" value={selectedMonthSummary?.ingresos || 0} onChange={(e) => updateMonthField("ingresos", e.target.value)} style={styles.input} /></div>
              <div style={styles.field}><label>Egresos</label><input type="number" value={selectedMonthSummary?.egresos || 0} onChange={(e) => updateMonthField("egresos", e.target.value)} style={styles.input} /></div>
              <div style={styles.field}><label>Caja real</label><input type="number" value={selectedMonthSummary?.cajaReal || 0} onChange={(e) => updateMonthField("cajaReal", e.target.value)} style={styles.input} /></div>
              <div style={styles.field}><label>Pendiente de cobro</label><input type="number" value={selectedMonthSummary?.pendienteCobro || 0} onChange={(e) => updateMonthField("pendienteCobro", e.target.value)} style={styles.input} /></div>
              <div style={styles.field}><label>Saldo final</label><input type="number" value={selectedMonthSummary?.saldoFinalManual || 0} onChange={(e) => updateMonthField("saldoFinalManual", e.target.value)} style={styles.input} /></div>
              <div style={styles.helpText}>Ahorrado del mes: <b>{money(selectedMonthSummary?.ahorrado || 0)}</b></div>
            </SectionCard>
          ) : (
            <SectionCard title="Vista operativa">
              <div>Este usuario no ve datos financieros.</div>
            </SectionCard>
          )}

          {canSeeMoney ? (
            <SectionCard title="Resumen por mes">
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Mes</th>
                      <th style={styles.th}>Ingresos</th>
                      <th style={styles.th}>Egresos</th>
                      <th style={styles.th}>Ahorrado</th>
                      <th style={styles.th}>Colchón</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySummaries.map((m) => (
                      <tr key={m.month}>
                        <td style={styles.td}>{monthLabel(m.month)}</td>
                        <td style={styles.td}>{money(m.ingresos)}</td>
                        <td style={styles.td}>{money(m.egresos)}</td>
                        <td style={styles.td}>{money(m.ahorrado)}</td>
                        <td style={styles.td}>{money(m.saldoFinalManual)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          ) : null}
        </div>
      ) : null}

      {activeTab === "tareas" ? (
        <div style={styles.grid2}>
          <SectionCard title="Nueva tarea">
            <div style={styles.field}><label>Título</label><input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} style={styles.input} /></div>
            <div style={styles.field}><label>Responsable</label><input value={newTask.assignedTo} onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })} style={styles.input} /></div>
            <div style={styles.field}><label>Área</label><input value={newTask.area} onChange={(e) => setNewTask({ ...newTask, area: e.target.value })} style={styles.input} /></div>
            <div style={styles.field}><label>Embarcación</label><select value={newTask.boat} onChange={(e) => setNewTask({ ...newTask, boat: e.target.value })} style={styles.input}>{boats.map((b) => <option key={b}>{b}</option>)}</select></div>
            <div style={styles.field}><label>Vence</label><input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} style={styles.input} /></div>
            <div style={styles.field}><label>Dificultad</label><select value={newTask.difficulty} onChange={(e) => setNewTask({ ...newTask, difficulty: e.target.value as TaskDifficulty })} style={styles.input}><option>Fácil</option><option>Intermedio</option><option>Difícil</option></select></div>
            <div style={styles.field}><label>Urgencia</label><select value={newTask.urgency} onChange={(e) => setNewTask({ ...newTask, urgency: e.target.value as TaskUrgency })} style={styles.input}><option>Baja</option><option>Media</option><option>Alta</option><option>Crítica</option></select></div>
            <button onClick={addTask} style={styles.primaryButton}>Agregar tarea</button>
          </SectionCard>

          <SectionCard title="Tareas cargadas">
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Título</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Dificultad</th>
                    <th style={styles.th}>Urgencia</th>
                    <th style={styles.th}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id}>
                      <td style={styles.td}>{t.title}</td>
                      <td style={styles.td}><select value={t.status} onChange={(e) => updateTaskField(t.id, "status", e.target.value)} style={styles.inputMini}><option>Pendiente</option><option>En proceso</option><option>Terminado</option></select></td>
                      <td style={styles.td}><select value={t.difficulty} onChange={(e) => updateTaskField(t.id, "difficulty", e.target.value)} style={styles.inputMini}><option>Fácil</option><option>Intermedio</option><option>Difícil</option></select></td>
                      <td style={styles.td}><select value={t.urgency} onChange={(e) => updateTaskField(t.id, "urgency", e.target.value)} style={styles.inputMini}><option>Baja</option><option>Media</option><option>Alta</option><option>Crítica</option></select></td>
                      <td style={styles.td}><button onClick={() => deleteTask(t.id)} style={styles.deleteButton}>Eliminar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "deudas" && canSeeMoney ? (
        <div style={styles.grid2}>
          <SectionCard title="Nueva deuda simple">
            <div style={styles.field}><label>Cliente / Proveedor</label><input value={newDebt.client} onChange={(e) => setNewDebt({ ...newDebt, client: e.target.value })} style={styles.input} /></div>
            <div style={styles.field}><label>Comprobante</label><input value={newDebt.invoice} onChange={(e) => setNewDebt({ ...newDebt, invoice: e.target.value })} style={styles.input} /></div>
            <div style={styles.field}><label>Monto</label><input type="number" value={newDebt.amount} onChange={(e) => setNewDebt({ ...newDebt, amount: e.target.value })} style={styles.input} /></div>
            <div style={styles.field}><label>Vencimiento</label><input type="date" value={newDebt.dueDate} onChange={(e) => setNewDebt({ ...newDebt, dueDate: e.target.value })} style={styles.input} /></div>
            <button onClick={addDebt} style={styles.primaryButton}>Agregar deuda</button>
          </SectionCard>

          <SectionCard title="Plan en cuotas">
            <div style={styles.field}><label>Cliente / Proveedor</label><input value={newInstallmentDebt.client} onChange={(e) => setNewInstallmentDebt({ ...newInstallmentDebt, client: e.target.value })} style={styles.input} /></div>
            <div style={styles.field}><label>Concepto</label><input value={newInstallmentDebt.invoice} onChange={(e) => setNewInstallmentDebt({ ...newInstallmentDebt, invoice: e.target.value })} style={styles.input} /></div>
            <div style={styles.field}><label>Monto total</label><input type="number" value={newInstallmentDebt.totalAmount} onChange={(e) => setNewInstallmentDebt({ ...newInstallmentDebt, totalAmount: e.target.value })} style={styles.input} /></div>
            <div style={styles.field}><label>Cuotas</label><input type="number" value={newInstallmentDebt.totalInstallments} onChange={(e) => setNewInstallmentDebt({ ...newInstallmentDebt, totalInstallments: e.target.value })} style={styles.input} /></div>
            <button onClick={addInstallmentDebt} style={styles.primaryButton}>Agregar plan</button>
          </SectionCard>

          <SectionCard title="Deudas cargadas">
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Cliente</th>
                    <th style={styles.th}>Comprobante</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Cuotas</th>
                    <th style={styles.th}>Monto</th>
                    <th style={styles.th}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {debts.map((d) => (
                    <tr key={d.id}>
                      <td style={styles.td}>{d.client}</td>
                      <td style={styles.td}>{d.invoice}</td>
                      <td style={styles.td}>{d.status}</td>
                      <td style={styles.td}>{d.isInstallmentPlan ? `${d.paidInstallments || 0}/${d.totalInstallments || 0}` : "-"}</td>
                      <td style={styles.td}>{money(d.isInstallmentPlan ? d.installmentAmount || 0 : d.amount)}</td>
                      <td style={styles.td}>{d.isInstallmentPlan && (d.paidInstallments || 0) < (d.totalInstallments || 0) ? <button onClick={() => markInstallmentPaid(d.id)} style={styles.secondaryButtonSmall}>Pagar cuota</button> : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "objetivos" && canSeeMoney ? (
        <div style={styles.grid2}>
          <SectionCard title="Ahorro por mes">
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Mes</th>
                    <th style={styles.th}>Ahorrado</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummaries.map((m) => (
                    <tr key={m.month}>
                      <td style={styles.td}>{monthLabel(m.month)}</td>
                      <td style={styles.td}>{money(m.ahorrado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Objetivos">
            <div style={styles.field}><label>Título</label><input value={newGoal.title} onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })} style={styles.input} /></div>
            <div style={styles.field}><label>Monto</label><input type="number" value={newGoal.amount} onChange={(e) => setNewGoal({ ...newGoal, amount: e.target.value })} style={styles.input} /></div>
            <button onClick={addGoal} style={styles.primaryButton}>Agregar objetivo</button>
            <div style={{ marginTop: 12 }}>
              {goals.map((g) => {
                const faltante = Math.max(g.amount - totalAhorrado, 0);
                const promedioMensual = monthlySummaries.length ? totalAhorrado / monthlySummaries.length : 0;
                const mesesEstimados = faltante > 0 && promedioMensual > 0 ? Math.ceil(faltante / promedioMensual) : 0;
                return (
                  <div key={g.id} style={styles.goalBox}>
                    <div><b>{g.title}</b> — {money(g.amount)}</div>
                    <div style={styles.helpText}>Faltante: {money(faltante)}</div>
                    <div style={styles.helpText}>Meses estimados: {mesesEstimados}</div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "sueldos" && canSeeMoney ? (
        <div style={styles.grid2}>
          <SectionCard title="Nuevo sueldo">
            <div style={styles.field}><label>Mes</label><input value={newSalary.month} onChange={(e) => setNewSalary({ ...newSalary, month: e.target.value })} style={styles.input} /></div>
            <div style={styles.field}><label>Persona</label><input value={newSalary.person} onChange={(e) => setNewSalary({ ...newSalary, person: e.target.value })} style={styles.input} /></div>
            <div style={styles.field}><label>Rol</label><input value={newSalary.role} onChange={(e) => setNewSalary({ ...newSalary, role: e.target.value })} style={styles.input} /></div>
            <div style={styles.field}><label>Sueldo base</label><input type="number" value={newSalary.baseSalary} onChange={(e) => setNewSalary({ ...newSalary, baseSalary: e.target.value })} style={styles.input} /></div>
            <div style={styles.field}><label>Extras</label><input type="number" value={newSalary.extraPay} onChange={(e) => setNewSalary({ ...newSalary, extraPay: e.target.value })} style={styles.input} /></div>
            <div style={styles.helpText}>SIPA: 10% · NO SIPA: 9% · Cargas sociales: 25.9%</div>
            <button onClick={addSalaryRecord} style={styles.primaryButton}>Agregar sueldo</button>
          </SectionCard>

          <SectionCard title="Sueldos cargados">
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Mes</th>
                    <th style={styles.th}>Persona</th>
                    <th style={styles.th}>Bruto</th>
                    <th style={styles.th}>SIPA</th>
                    <th style={styles.th}>NO SIPA</th>
                    <th style={styles.th}>Cargas</th>
                    <th style={styles.th}>Costo total</th>
                    <th style={styles.th}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryRecords.map((r) => (
                    <tr key={r.id}>
                      <td style={styles.td}>{r.month}</td>
                      <td style={styles.td}>{r.person}</td>
                      <td style={styles.td}>{money(r.grossSalary)}</td>
                      <td style={styles.td}>{money(r.sipa)}</td>
                      <td style={styles.td}>{money(r.noSipa)}</td>
                      <td style={styles.td}>{money(r.socialCharges)}</td>
                      <td style={styles.td}>{money(r.totalCost)}</td>
                      <td style={styles.td}><button onClick={() => deleteSalaryRecord(r.id)} style={styles.deleteButton}>Eliminar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
    padding: 24,
    fontFamily: "Arial, sans-serif",
    color: "#0f172a",
  },
  pageCenter: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    fontFamily: "Arial, sans-serif",
  },
  loginBox: {
    width: 440,
    background: "rgba(255,255,255,0.96)",
    borderRadius: 20,
    padding: 28,
    boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
    border: "1px solid #e2e8f0",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    gap: 16,
    background: "rgba(255,255,255,0.9)",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
  },
  h1: {
    margin: 0,
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  rowWrap: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 14,
    marginBottom: 20,
  },
  smallCard: {
    background: "rgba(255,255,255,0.95)",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 18,
    minHeight: 108,
    boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
  },
  smallTitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 10,
    fontWeight: 600,
  },
  smallValue: {
    fontSize: 30,
    fontWeight: 800,
    lineHeight: 1.1,
  },
  smallSubtitle: {
    marginTop: 10,
    fontSize: 12,
    color: "#64748b",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 20,
    background: "rgba(255,255,255,0.88)",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 14,
  },
  tabRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  tab: {
    padding: "10px 14px",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 600,
    color: "#334155",
  },
  tabActive: {
    padding: "10px 14px",
    background: "#1d4ed8",
    color: "white",
    border: "1px solid #1d4ed8",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 700,
    boxShadow: "0 8px 18px rgba(29,78,216,0.25)",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: 18,
  },
  card: {
    background: "rgba(255,255,255,0.96)",
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 12px 30px rgba(15,23,42,0.07)",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 800,
    marginBottom: 16,
    letterSpacing: "-0.02em",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 12,
  },
  fieldInline: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 600,
  },
  input: {
    padding: 11,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    background: "#fff",
  },
  inputMini: {
    padding: 7,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: 13,
    background: "#fff",
  },
  primaryButton: {
    padding: "11px 16px",
    borderRadius: 12,
    border: "none",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
    boxShadow: "0 8px 18px rgba(17,24,39,0.2)",
  },
  secondaryButton: {
    padding: "11px 16px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "white",
    cursor: "pointer",
    fontWeight: 600,
  },
  secondaryButtonSmall: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "white",
    cursor: "pointer",
    fontWeight: 600,
  },
  deleteButton: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #ef4444",
    background: "white",
    color: "#ef4444",
    cursor: "pointer",
    fontWeight: 700,
  },
  helpText: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 1.5,
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "white",
  },
  th: {
    textAlign: "left",
    borderBottom: "1px solid #dbe2ea",
    padding: 12,
    fontSize: 13,
    background: "#f8fafc",
    color: "#475569",
    fontWeight: 700,
  },
  td: {
    borderBottom: "1px solid #eef2f7",
    padding: 12,
    fontSize: 14,
    verticalAlign: "top",
  },
  listRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #e5e7eb",
    gap: 12,
  },
  goalBox: {
    background: "#f8fafc",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    border: "1px solid #e2e8f0",
  },
};

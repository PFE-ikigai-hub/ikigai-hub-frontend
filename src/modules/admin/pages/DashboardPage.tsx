import { useEffect, useState } from "react";
import { deliverablesApi, projectsApi, usersApi } from "@/core/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { motion } from "framer-motion";
import { UsersThree, Briefcase, File, ShieldCheck, CheckCircle, XCircle } from "@phosphor-icons/react";
import { useI18n } from "@/core/i18n/I18nProvider";

export function AdminDashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState({ users: 0, projects: 0, deliverables: 0 });

  useEffect(() => {
    const load = async () => {
      const [users, projects, deliverables] = await Promise.all([
        usersApi.list({ size: 1 }),
        projectsApi.list({ size: 1 }),
        deliverablesApi.list({ size: 1 })
      ]);
      setStats({
        users: users.totalElements ?? 0,
        projects: projects.totalElements ?? 0,
        deliverables: deliverables.totalElements ?? 0
      });
    };
    load().catch(() => undefined);
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-normal text-stone-900 dark:text-white tracking-tight">{t('nav.admin')}</h1>
        <p className="text-stone-500 dark:text-stone-400 mt-2">{t('admin.dashboardDescription')}</p>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        <motion.div variants={item}>
          <Card borderGlow glowColors={['#000000', '#333333']}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-widest text-stone-500">{t('admin.totalUsers')}</CardTitle>
              <UsersThree className="h-4 w-4 text-stone-400" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-normal tracking-tighter">{stats.users}</div>
              <p className="text-xs text-stone-500 mt-2">+12% from last month</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card borderGlow glowColors={['#000000', '#333333']}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-widest text-stone-500">{t('admin.totalProjects')}</CardTitle>
              <Briefcase className="h-4 w-4 text-stone-400" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-normal tracking-tighter">{stats.projects}</div>
              <p className="text-xs text-stone-500 mt-2">5 projects on review</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card borderGlow glowColors={['#000000', '#333333']}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-widest text-stone-500">{t('admin.totalDeliverables')}</CardTitle>
              <File className="h-4 w-4 text-stone-400" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-normal tracking-tighter">{stats.deliverables}</div>
              <p className="text-xs text-stone-500 mt-2">12 new uploads today</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function AdminUsersPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<{ id: number; name: string; email: string; role: string; actif: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.list({ size: 100 }).then((res) => {
      setRows(
        res.content.map((u) => ({
          id: u.id,
          name: `${u.prenom} ${u.nom}`,
          email: u.email,
          role: u.role,
          actif: u.actif
        }))
      );
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-normal tracking-tight">{t('admin.usersManagement')}</h1>
      </div>

      <Card className="overflow-hidden border-none shadow-2xl shadow-stone-200/50 dark:shadow-black/60 bg-white/80 dark:bg-stone-900/40 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800/60">
                <th className="py-4 px-6 text-xs font-semibold text-stone-400 uppercase tracking-wider">{t('admin.user')}</th>
                <th className="py-4 px-6 text-xs font-semibold text-stone-400 uppercase tracking-wider">{t('admin.email')}</th>
                <th className="py-4 px-6 text-xs font-semibold text-stone-400 uppercase tracking-wider">{t('admin.role')}</th>
                <th className="py-4 px-6 text-xs font-semibold text-stone-400 uppercase tracking-wider">{t('admin.status')}</th>
                <th className="py-4 px-6 text-xs font-semibold text-stone-400 uppercase tracking-wider text-right">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-stone-100/50 dark:border-stone-800/30 hover:bg-stone-50/50 dark:hover:bg-stone-800/20 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-xs font-bold border border-stone-200 dark:border-stone-700">
                        {row.name.charAt(0)}
                      </div>
                      <span className="font-medium">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-stone-500">{row.email}</td>
                  <td className="py-4 px-6">
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {row.role}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      row.actif 
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-green-200 dark:border-white/10' 
                        : 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-white/10'
                    }`}>
                      {row.actif ? t('admin.active') : t('admin.inactive')}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={async () => {
                        if (row.actif) await usersApi.deactivate(row.id);
                        else await usersApi.activate(row.id);
                        setRows((prev) => prev.map((p) => (p.id === row.id ? { ...p, actif: !p.actif } : p)));
                      }}
                      className={`text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-opacity ${row.actif ? 'text-red-500' : 'text-green-600'}`}
                    >
                      {row.actif ? t('admin.deactivate') : t('admin.activate')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function AdminProjectsPage() {
  const { t } = useI18n();
  const [projects, setProjects] = useState<{ id: number; nom: string; clientNom: string; statut: string }[]>([]);

  useEffect(() => {
    projectsApi.list({ size: 100 }).then((res) => setProjects(res.content));
  }, []);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-normal tracking-tight">{t('admin.projectsManagement')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((p) => (
          <Card key={p.id} className="group hover:-translate-y-1 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold">{p.nom}</CardTitle>
              <CardDescription>{p.clientNom}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  p.statut === 'EN_COURS' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-stone-100 text-stone-500 border-stone-200'
                }`}>
                  {t(`status.${p.statut}`)}
                </span>
                <div className="flex gap-2">
	                  {p.statut !== "ARCHIVE" ? (
	                    <button 
	                      onClick={async () => {
	                        if (p.statut !== "TERMINE") return;
	                        const adminPassword = window.prompt("Mot de passe administrateur requis pour archiver.");
	                        if (!adminPassword) return;
	                        await projectsApi.archive(p.id, adminPassword);
	                        setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, statut: "ARCHIVE" } : x)));
	                      }}
	                      className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
	                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  ) : (
                    <button 
                      onClick={async () => {
                        await projectsApi.unarchive(p.id);
                        setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, statut: "EN_COURS" } : x)));
                      }}
                       className="p-1.5 text-stone-400 hover:text-green-600 transition-colors"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AdminDeliverablesPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<{ id: number; nom: string; projetNom: string; statut: string; type: string }[]>([]);

  useEffect(() => {
    deliverablesApi.list({ size: 100 }).then((res) => setRows(res.content));
  }, []);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-normal tracking-tight">{t('admin.deliverablesManagement')}</h2>
      <Card className="bg-white/50 dark:bg-stone-900/20 backdrop-blur-xl border-stone-200/50 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-100 dark:border-white/10 uppercase text-[10px] tracking-widest text-stone-400">
                  <th className="py-4 px-6">{t('deliverables.name')}</th>
                  <th className="py-4 px-6">{t('deliverables.project')}</th>
                  <th className="py-4 px-6">{t('deliverables.type')}</th>
                  <th className="py-4 px-6">{t('deliverables.status')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-stone-100/50 dark:border-white/5 hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 font-medium text-stone-900 dark:text-white">{r.nom}</td>
                    <td className="py-4 px-6 text-sm text-stone-500">{r.projetNom}</td>
                    <td className="py-4 px-6 text-xs text-stone-400">{r.type}</td>
                    <td className="py-4 px-6">
                       <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-stone-200 dark:border-stone-700">
                         {t(`status.${r.statut}`)}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      </Card>
    </div>
  );
}

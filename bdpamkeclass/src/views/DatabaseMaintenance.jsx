import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import axios from "axios";
import { toast } from "sonner";
import { AlertTriangle, DatabaseBackup, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function rowLabel(row, pkColumns) {
  const keys = pkColumns.map((pk) => `${pk}: ${row[pk]}`);
  return keys.join(" | ");
}

export default function DatabaseMaintenance() {
  const [tables, setTables] = useState([]);
  const [selectedTableName, setSelectedTableName] = useState("");
  const [tableRows, setTableRows] = useState([]);
  const [pkColumns, setPkColumns] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedKeysMap, setSelectedKeysMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoringBatchId, setRestoringBatchId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const selectedKeys = useMemo(
    () => tableRows.filter((row) => !!selectedKeysMap[rowLabel(row, pkColumns)]).map((row) => {
      const key = {};
      for (const pk of pkColumns) key[pk] = row[pk];
      return key;
    }),
    [pkColumns, selectedKeysMap, tableRows]
  );
  const allSelected = tableRows.length > 0 && selectedKeys.length === tableRows.length;

  async function loadTables() {
    const { data } = await axios.get("/api/admin/db-maintenance/tables");
    setTables(data);
    if (!selectedTableName && data.length > 0) setSelectedTableName(data[0].tableName);
    return data;
  }

  async function loadRows(tableName) {
    if (!tableName) return;
    const { data } = await axios.get(`/api/admin/db-maintenance/table/${tableName}/rows?limit=300`);
    setTableRows(data.rows);
    setPkColumns(data.primaryKeyColumns);
    setSelectedKeysMap({});
  }

  async function loadBatches() {
    const { data } = await axios.get("/api/admin/db-maintenance/deletion-batches");
    setBatches(data);
  }

  async function loadData() {
    try {
      const availableTables = await loadTables();
      const tableToLoad = selectedTableName || availableTables[0]?.tableName || "";
      if (tableToLoad) await loadRows(tableToLoad);
      await loadBatches();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to load database maintenance data.");
    }
  }

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedTableName) return;
    loadRows(selectedTableName).catch((err) => {
      toast.error(err?.response?.data?.error || "Failed to load table rows.");
    });
  }, [selectedTableName]);

  async function refresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function toggleRow(row) {
    const key = rowLabel(row, pkColumns);
    setSelectedKeysMap((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleAll(checked) {
    const next = {};
    if (checked) {
      for (const row of tableRows) {
        next[rowLabel(row, pkColumns)] = true;
      }
    }
    setSelectedKeysMap(next);
  }

  async function bulkDelete() {
    if (!selectedTableName || selectedKeys.length === 0) return;
    setDeleting(true);
    try {
      const { data } = await axios.post("/api/admin/db-maintenance/table/bulk-delete", {
        tableName: selectedTableName,
        keys: selectedKeys,
      });
      toast.success(
        `Deleted ${data.batch.deletedRowsCount} rows from ${data.batch.tableName}. Recovery batch ${data.batch.id.slice(0, 8)} created.`
      );
      setShowDeleteConfirm(false);
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Bulk delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  async function restoreBatch(batchId) {
    setRestoringBatchId(batchId);
    try {
      await axios.post(`/api/admin/db-maintenance/deletion-batches/${batchId}/restore`);
      toast.success("Batch restored successfully.");
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Restore failed.");
    } finally {
      setRestoringBatchId(null);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DatabaseBackup className="h-6 w-6 text-red-500" />
            Database Maintenance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Admin-only bulk delete and recovery for non-security / non-role tables.
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={refreshing || loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="border-red-300/50">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Bulk Delete by Table
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Select value={selectedTableName} onValueChange={setSelectedTableName}>
              <SelectTrigger>
                <SelectValue placeholder="Select table" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((t) => (
                  <SelectItem key={t.tableName} value={t.tableName}>
                    {t.tableName} ({t.rowCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : tableRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rows available for selected table.</p>
          ) : (
            <div className="border rounded-md max-h-80 overflow-auto">
              <div className="flex items-center gap-3 p-3 border-b bg-muted/40">
                <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(!!v)} />
                <span className="text-sm font-medium">Select all ({tableRows.length})</span>
              </div>
              <ul>
                {tableRows.map((row) => (
                  <li key={rowLabel(row, pkColumns)} className="flex items-center gap-3 p-3 border-b last:border-b-0">
                    <Checkbox checked={!!selectedKeysMap[rowLabel(row, pkColumns)]} onCheckedChange={() => toggleRow(row)} />
                    <span className="text-sm font-mono">{rowLabel(row, pkColumns)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedKeys.length} selected
            </span>
            <Button
              variant="destructive"
              disabled={!selectedTableName || selectedKeys.length === 0 || deleting}
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? "Deleting..." : "Delete Selected"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recovery Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : batches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recovery batches yet.</p>
          ) : (
            <div className="space-y-2">
              {batches.map((batch) => (
                <div key={batch.id} className="border rounded-md p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <div className="font-medium">
                      Batch {batch.id.slice(0, 8)} • {batch.tables.map((t) => `${t.tableName}(${t.deletedRowsCount})`).join(", ")}
                    </div>
                    <div className="text-muted-foreground">
                      Created by {batch.createdBy.username} on {format(new Date(batch.createdAt), "MMM d, yyyy h:mm a")}
                    </div>
                    {batch.restoredAt && (
                      <div className="text-green-600">
                        Restored by {batch.restoredBy?.username || "unknown"} on {format(new Date(batch.restoredAt), "MMM d, yyyy h:mm a")}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    disabled={!!batch.restoredAt || restoringBatchId === batch.id}
                    onClick={() => restoreBatch(batch.id)}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {restoringBatchId === batch.id ? "Restoring..." : batch.restoredAt ? "Restored" : "Restore"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedKeys.length} selected rows from {selectedTableName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes selected rows from the active table. A recovery batch will be created so you can restore later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={bulkDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Confirm Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

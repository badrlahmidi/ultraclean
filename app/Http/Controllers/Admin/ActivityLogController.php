<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class ActivityLogController extends Controller
{
    private function applyFilters($query, Request $request)
    {
        if ($userId = $request->query('user_id')) {
            $query->where('user_id', $userId);
        }
        if ($action = $request->query('action')) {
            $query->where('action', 'like', "%{$action}%");
        }
        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }
        return $query;
    }

    public function index(Request $request): Response
    {
        $logs = $this->applyFilters(
            ActivityLog::with('user:id,name,role')->latest(),
            $request
        )->paginate(50)->withQueryString();

        $users   = User::orderBy('name')->get(['id', 'name', 'role']);
        $actions = ActivityLog::select('action')
            ->distinct()->orderBy('action')->pluck('action');

        return Inertia::render('Admin/ActivityLog/Index', [
            'logs'    => $logs,
            'users'   => $users,
            'actions' => $actions,
            'filters' => $request->only('user_id', 'action', 'from', 'to'),
        ]);
    }

    public function export(Request $request): HttpResponse
    {
        $rows = $this->applyFilters(
            ActivityLog::with('user:id,name,role')->latest(),
            $request
        )->get();

        $csv = "Date,Utilisateur,Rôle,Action,Entité,ID Entité,IP\n";
        foreach ($rows as $log) {
            $subject = $log->subject_type ? class_basename($log->subject_type) : '';
            $csv .= implode(',', [
                $log->created_at->format('Y-m-d H:i:s'),
                '"' . str_replace('"', '""', $log->user?->name ?? 'Système') . '"',
                $log->user?->role ?? '',
                '"' . str_replace('"', '""', $log->action) . '"',
                $subject,
                $log->subject_id ?? '',
                $log->ip_address ?? '',
            ]) . "\n";
        }

        $filename = 'journal_audit_' . now()->format('Y-m-d') . '.csv';

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}

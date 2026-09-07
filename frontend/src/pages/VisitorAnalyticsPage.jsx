import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

import {
  Eye,
  Users,
  UserPlus,
  Monitor,
  Smartphone,
  Table as TableIcon,
  Globe,
} from 'lucide-react';

import PageHeader from '../components/PageHeader.jsx';
import DateFilterPicker from '../components/DateFilterPicker.jsx';
import StatCard from '../components/StatCard.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import api from '../services/api.js';
import { useDateFilter } from '../context/DateFilterContext.jsx';

const PIE_COLORS = [
  '#3464ff',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#f97316',
  '#ef4444',
];

const deviceIcons = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: TableIcon,
};

export default function VisitorAnalyticsPage() {
  const { params } = useDateFilter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [pages, setPages] = useState([]);
  const [breakdown, setBreakdown] = useState(null);

  const fetchAll = async () => {
    setLoading(true);

    try {
      const [
        { data: statsResponse },
        { data: trendsResponse },
        { data: pagesResponse },
        { data: breakdownResponse },
      ] = await Promise.all([
        api.get('/visitors/stats', { params }),
        api.get('/visitors/trends', { params }),
        api.get('/visitors/top-pages', { params }),
        api.get('/visitors/breakdown', { params }),
      ]);

      setStats(statsResponse.stats || statsResponse);
      setTrends(trendsResponse.data || []);
      setPages(pagesResponse.data || []);
      setBreakdown(breakdownResponse || null);
    } catch (error) {
      console.error('Visitor analytics error:', error);

      setStats(null);
      setTrends([]);
      setPages([]);
      setBreakdown(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.range, params.startDate, params.endDate]);

  if (loading && !stats) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const noData =
    !stats ||
    (
      (stats.totalVisits || 0) === 0 &&
      (stats.uniqueVisitors || 0) === 0 &&
      trends.length === 0 &&
      pages.length === 0
    );

  const deviceData = breakdown?.byDevice || [];
  const browserData = breakdown?.byBrowser || [];
  const countryData = breakdown?.byCountry || [];

  return (
    <div className="space-y-5">

      <PageHeader
        title="Visitor Analytics"
        subtitle="Track website traffic, visitor behavior, and engagement patterns"
        breadcrumbs={['Home', 'Visitor Analytics']}
        actions={<DateFilterPicker />}
      />

      {/* STATISTICS */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">

        <StatCard
          title="Total Visits"
          value={stats?.totalVisits?.toLocaleString() || 0}
          Icon={Eye}
          accent="brand"
          change={null}
        />

        <StatCard
          title="Unique Visitors"
          value={stats?.uniqueVisitors?.toLocaleString() || 0}
          Icon={Users}
          accent="violet"
          change={null}
        />

        <StatCard
          title="Returning Visitors"
          value={stats?.returningVisitors?.toLocaleString() || 0}
          Icon={UserPlus}
          accent="emerald"
          change={null}
          footer={`New visitors: ${stats?.newVisitors || 0}`}
        />

        <StatCard
          title="Registered Visitors"
          value={stats?.registeredUnique?.toLocaleString() || 0}
          Icon={Globe}
          accent="fuchsia"
          change={null}
          footer={`Registered visits: ${stats?.registeredVisits || 0}`}
        />

      </div>

      {noData ? (

        <div className="card p-5">
          <EmptyState
            icon="data"
            title="No visitor tracking data yet"
            description="Visitor analytics will appear here once website traffic data is collected."
          />
        </div>

      ) : (

        <>

          {/* VISITOR TRAFFIC TREND */}

          <div className="card p-5">

            <h3 className="font-semibold text-surface-900 mb-1.5">
              Visitor Traffic Trends
            </h3>

            <p className="text-sm text-surface-500 mb-4">
              Daily total, unique, and registered candidate visits
            </p>

            <div className="h-72">

              {trends.length === 0 ? (

                <EmptyState
                  icon="data"
                  title="No visitor tracking data yet"
                  description="Visitor analytics will appear here once website traffic data is collected."
                />

              ) : (

                <ResponsiveContainer width="100%" height="100%">

                  <AreaChart
                    data={trends}
                    margin={{
                      top: 5,
                      right: 10,
                      left: -20,
                      bottom: 0,
                    }}
                  >

                    <defs>

                      <linearGradient
                        id="v1"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#3464ff"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="100%"
                          stopColor="#3464ff"
                          stopOpacity={0}
                        />
                      </linearGradient>

                      <linearGradient
                        id="v2"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#8b5cf6"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="#8b5cf6"
                          stopOpacity={0}
                        />
                      </linearGradient>

                      <linearGradient
                        id="v3"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#ec4899"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#ec4899"
                          stopOpacity={0}
                        />
                      </linearGradient>

                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: 14,
                        border: '1px solid #e2e8f0',
                      }}
                    />

                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12 }}
                    />

                    <Area
                      type="monotone"
                      dataKey="totalVisits"
                      stroke="#3464ff"
                      strokeWidth={2.2}
                      fill="url(#v1)"
                    />

                    <Area
                      type="monotone"
                      dataKey="uniqueVisitors"
                      stroke="#8b5cf6"
                      strokeWidth={2.2}
                      fill="url(#v2)"
                    />

                    <Area
                      type="monotone"
                      dataKey="registeredVisits"
                      stroke="#ec4899"
                      strokeWidth={2.2}
                      fill="url(#v3)"
                    />

                  </AreaChart>

                </ResponsiveContainer>

              )}

            </div>

          </div>


          {/* TOP PAGES + DEVICE MIX */}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5">

            <div className="card p-5 xl:col-span-2">

              <h3 className="font-semibold text-surface-900 mb-1.5">
                Most Visited Pages
              </h3>

              <p className="text-sm text-surface-500 mb-4">
                Top pages by views and unique visitors
              </p>

              <div className="h-72">

                {pages.length === 0 ? (

                  <EmptyState
                    icon="data"
                    title="No visitor tracking data yet"
                    description="Visitor analytics will appear here once website traffic data is collected."
                  />

                ) : (

                  <ResponsiveContainer width="100%" height="100%">

                    <BarChart
                      data={pages}
                      margin={{
                        top: 5,
                        right: 10,
                        left: -20,
                        bottom: 0,
                      }}
                    >

                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="pageTitle"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />

                      <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />

                      <Tooltip
                        contentStyle={{
                          borderRadius: 14,
                          border: '1px solid #e2e8f0',
                        }}
                      />

                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12 }}
                      />

                      <Bar
                        dataKey="views"
                        fill="#3464ff"
                        radius={[6, 6, 0, 0]}
                      />

                      <Bar
                        dataKey="uniqueVisitors"
                        fill="#8b5cf6"
                        radius={[6, 6, 0, 0]}
                      />

                    </BarChart>

                  </ResponsiveContainer>

                )}

              </div>

            </div>


            {/* DEVICE MIX */}

            <div className="card p-5">

              <h3 className="font-semibold text-surface-900 mb-1.5">
                Device Mix
              </h3>

              <p className="text-sm text-surface-500 mb-4">
                Visits by device type
              </p>

              <div className="h-60">

                {deviceData.length === 0 ? (

                  <EmptyState
                    icon="data"
                    title="No visitor tracking data yet"
                    description="Device breakdown will appear as data is collected."
                  />

                ) : (

                  <ResponsiveContainer width="100%" height="100%">

                    <PieChart>

                      <Pie
                        data={deviceData.map((item) => ({
                          ...item,
                          name:
                            item.device?.charAt(0).toUpperCase() +
                            item.device?.slice(1),
                          value: item.count,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) =>
                          percent > 0.05 ? name : ''
                        }
                      >

                        {deviceData.map((_, index) => (
                          <Cell
                            key={index}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}

                      </Pie>

                      <Tooltip
                        contentStyle={{
                          borderRadius: 14,
                          border: '1px solid #e2e8f0',
                        }}
                      />

                    </PieChart>

                  </ResponsiveContainer>

                )}

              </div>


              <div className="grid grid-cols-3 gap-2 mt-2">

                {deviceData.map((device) => {

                  const Icon =
                    deviceIcons[device.device] || Monitor;

                  return (
                    <div
                      key={device.device}
                      className="rounded-xl border border-surface-100 bg-surface-50/60 p-3 text-center"
                    >

                      <Icon className="h-4 w-4 mx-auto mb-1 text-surface-500" />

                      <div className="text-xs text-surface-500 capitalize">
                        {device.device}
                      </div>

                      <div className="text-base font-extrabold text-surface-900">
                        {device.count.toLocaleString()}
                      </div>

                    </div>
                  );
                })}

              </div>

            </div>

          </div>


          {/* BROWSERS + COUNTRIES */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">


            {/* TOP BROWSERS */}

            <div className="card p-5">

              <h3 className="font-semibold text-surface-900 mb-4">
                Top Browsers
              </h3>

              <div className="space-y-3">

                {browserData.length === 0 ? (

                  <p className="text-sm text-surface-500 text-center py-8">
                    No visitor tracking data yet.
                  </p>

                ) : (

                  browserData.slice(0, 6).map((browser, index) => {

                    const max =
                      browserData[0]?.count || 1;

                    const percentage =
                      (browser.count / max) * 100;

                    return (
                      <div key={browser.browser}>

                        <div className="flex items-center justify-between text-sm mb-1">

                          <span className="font-medium text-surface-800">
                            {browser.browser}
                          </span>

                          <span className="text-surface-500">
                            {browser.count.toLocaleString()}
                          </span>

                        </div>

                        <div className="h-2 rounded-full bg-surface-100 overflow-hidden">

                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              background:
                                PIE_COLORS[
                                  index % PIE_COLORS.length
                                ],
                            }}
                          />

                        </div>

                      </div>
                    );
                  })

                )}

              </div>

            </div>


            {/* TOP COUNTRIES */}

            <div className="card p-5">

              <h3 className="font-semibold text-surface-900 mb-4">
                Top Countries
              </h3>

              <div className="space-y-3">

                {countryData.length === 0 ? (

                  <p className="text-sm text-surface-500 text-center py-8">
                    No visitor tracking data yet.
                  </p>

                ) : (

                  countryData.slice(0, 6).map((country) => {

                    const max =
                      countryData[0]?.count || 1;

                    const percentage =
                      (country.count / max) * 100;

                    return (
                      <div key={country.country}>

                        <div className="flex items-center justify-between text-sm mb-1">

                          <span className="font-medium text-surface-800 flex items-center gap-2">

                            <Globe className="h-3.5 w-3.5 text-surface-400" />

                            {country.country}

                          </span>

                          <span className="text-surface-500">
                            {country.count.toLocaleString()}
                          </span>

                        </div>

                        <div className="h-2 rounded-full bg-surface-100 overflow-hidden">

                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />

                        </div>

                      </div>
                    );
                  })

                )}

              </div>

            </div>

          </div>

        </>

      )}

    </div>
  );
}
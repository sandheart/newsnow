import { createFileRoute } from "@tanstack/react-router"
import { Button, Card, DatePicker, Form, Input, Space, Table } from "antd"
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"

export const Route = createFileRoute("/admin/news")({
  component: NewsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    source_id: (search.source_id as string) || "",
    keyword: (search.keyword as string) || "",
    start_time: search.start_time ? Number(search.start_time) : undefined,
    end_time: search.end_time ? Number(search.end_time) : undefined,
    page: search.page ? Number(search.page) : 1,
    page_size: search.page_size ? Number(search.page_size) : 20,
  }),
})

interface NewsRecord {
  source_id: string
  item_id: string
  title: string
  url: string
  extra: string
  fetched_at: number
}

interface NewsResponse {
  items: NewsRecord[]
  total: number
  page: number
  pageSize: number
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN")
}

function getExtraInfo(extra: string): string {
  try {
    const obj = JSON.parse(extra)
    return obj.info || "-"
  } catch {
    return "-"
  }
}

function NewsPage() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const [form] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "news", search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search.source_id) params.set("source_id", search.source_id)
      if (search.keyword) params.set("keyword", search.keyword)
      if (search.start_time) params.set("start_time", String(search.start_time))
      if (search.end_time) params.set("end_time", String(search.end_time))
      params.set("page", String(search.page))
      params.set("page_size", String(search.page_size))
      const res = await myFetch(`/persistent/news?${params.toString()}`)
      return res as NewsResponse
    },
  })

  const handleSearch = () => {
    const values = form.getFieldsValue()
    const newSearch: Record<string, any> = {
      source_id: values.source_id || "",
      keyword: values.keyword || "",
      page: 1,
    }
    if (values.timeRange?.[0]) newSearch.start_time = values.timeRange[0].valueOf()
    if (values.timeRange?.[1]) newSearch.end_time = values.timeRange[1].valueOf()
    navigate({ search: newSearch })
  }

  const handleReset = () => {
    form.resetFields()
    navigate({ search: {} })
  }

  const handlePageChange = (page: number, pageSize: number) => {
    navigate({ search: { ...search, page, page_size: pageSize } })
  }

  const columns: ColumnsType<NewsRecord> = [
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      render: (v: string, record) => (
        <a href={record.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">
          {v}
        </a>
      ),
    },
    {
      title: "数据源",
      dataIndex: "source_id",
      key: "source_id",
      width: 200,
    },
    {
      title: "来源",
      key: "source_info",
      width: 150,
      render: (_, record) => getExtraInfo(record.extra),
    },
    {
      title: "获取时间",
      dataIndex: "fetched_at",
      key: "fetched_at",
      width: 180,
      render: (v: number) => formatTime(v),
    },
    {
      title: "操作",
      key: "action",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <a href={record.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">
          查看原文
        </a>
      ),
    },
  ]

  const initialValues = {
    source_id: search.source_id,
    keyword: search.keyword,
    timeRange: search.start_time && search.end_time
      ? [dayjs(search.start_time), dayjs(search.end_time)]
      : undefined,
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="过滤条件" size="small">
        <Form form={form} layout="inline" initialValues={initialValues}>
          <Form.Item name="source_id" label="数据源">
            <Input placeholder="数据源 ID" allowClear style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="keyword" label="标题关键字">
            <Input placeholder="模糊匹配" allowClear style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="timeRange" label="时间范围">
            <DatePicker.RangePicker showTime style={{ width: 380 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Table
        columns={columns}
        dataSource={data?.items}
        loading={isLoading}
        rowKey={r => `${r.source_id}-${r.item_id}`}
        scroll={{ x: 800 }}
        size="small"
        pagination={{
          current: data?.page || 1,
          total: data?.total || 0,
          pageSize: search.page_size,
          onChange: handlePageChange,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          showTotal: t => `共 ${t} 条`,
        }}
      />
    </div>
  )
}

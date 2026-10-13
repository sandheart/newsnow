import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Button, Card, Form, Input, Select, Space, Table, Tag, Tooltip } from "antd"
import { ReloadOutlined, SearchOutlined, StarFilled, StarOutlined } from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import { useQuery } from "@tanstack/react-query"
import type { SourceID } from "@shared/types"
import { useFocus } from "~/hooks/useFocus"

export const Route = createFileRoute("/admin/sources")({
  component: SourcesPage,
  validateSearch: (search: Record<string, unknown>) => ({
    source_id: (search.source_id as string) || "",
    source_name: (search.source_name as string) || "",
    title: (search.title as string) || "",
    type: (search.type as string) || "",
    column: (search.column as string) || "",
    focused: (search.focused as string) || "",
  }),
})

interface SourceRecord {
  source_id: string
  source_name: string
  title: string | null
  type: string | null
  column: string | null
  interval: number | null
  home: string | null
  desc: string | null
  created_at: number
  last_fetched_at: number
}

function formatInterval(ms: number | null): string {
  if (!ms) return "-"
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  return `${hours}小时`
}

function formatTime(ts: number | null): string {
  if (!ts) return "-"
  return new Date(ts).toLocaleString("zh-CN")
}

function SourcesPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [form] = Form.useForm()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { toggleFocus, isFocused } = useFocus()

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "sources", search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search.source_id) params.set("source_id", search.source_id)
      if (search.source_name) params.set("source_name", search.source_name)
      if (search.title) params.set("title", search.title)
      if (search.type) params.set("type", search.type)
      if (search.column) params.set("column", search.column)
      const res = await myFetch(`/persistent/sources?${params.toString()}`)
      return res as SourceRecord[]
    },
  })

  const handleSearch = () => {
    const values = form.getFieldsValue()
    navigate({ search: values })
  }

  const handleReset = () => {
    form.resetFields()
    navigate({ search: {} })
  }

  const handleViewNews = (sourceId: string) => {
    window.open(`/admin/news?source_id=${sourceId}`, "_blank")
  }

  const filteredData = useMemo(() => {
    if (!data) return data
    if (!search.focused) return data
    const wantFocused = search.focused === "yes"
    return data.filter(item => isFocused(item.source_id as SourceID) === wantFocused)
  }, [data, search.focused, isFocused])

  const columns: ColumnsType<SourceRecord> = [
    {
      title: "数据源 ID",
      dataIndex: "source_id",
      key: "source_id",
      width: 180,
      fixed: "left",
    },
    {
      title: "名称",
      dataIndex: "source_name",
      key: "source_name",
      width: 150,
    },
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      width: 120,
      render: (v: string | null) => v || "-",
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (v: string | null) => v
        ? (
            <Tag color={v === "hottest" ? "red" : "blue"}>{v}</Tag>
          )
        : "-",
    },
    {
      title: "栏目",
      dataIndex: "column",
      key: "column",
      width: 100,
      render: (v: string | null) => v || "-",
    },
    {
      title: "刷新间隔",
      dataIndex: "interval",
      key: "interval",
      width: 100,
      render: (v: number | null) => formatInterval(v),
    },
    {
      title: "最后获取",
      dataIndex: "last_fetched_at",
      key: "last_fetched_at",
      width: 180,
      render: (v: number | null) => formatTime(v),
    },
    {
      title: "是否关注",
      key: "focused",
      width: 80,
      render: (_, record) => {
        const focused = isFocused(record.source_id as SourceID)
        return (
          <Tooltip title={focused ? "取消关注" : "添加关注"}>
            <Button
              type="text"
              size="small"
              icon={focused ? <StarFilled style={{ color: "#faad14" }} /> : <StarOutlined />}
              onClick={() => toggleFocus(record.source_id as SourceID)}
            />
          </Tooltip>
        )
      },
    },
    {
      title: "操作",
      key: "action",
      width: 120,
      fixed: "right",
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => handleViewNews(record.source_id)}>
          查看新闻
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Card title="过滤条件" size="small">
        <Form form={form} layout="inline" initialValues={search}>
          <Form.Item name="source_id" label="数据源 ID">
            <Input placeholder="模糊匹配" allowClear style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="source_name" label="名称">
            <Input placeholder="模糊匹配" allowClear style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="title" label="标题">
            <Input placeholder="模糊匹配" allowClear style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Select allowClear style={{ width: 120 }} placeholder="选择类型">
              <Select.Option value="hottest">hottest</Select.Option>
              <Select.Option value="realtime">realtime</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="column" label="栏目">
            <Input placeholder="精确匹配" allowClear style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="focused" label="是否关注">
            <Select allowClear style={{ width: 120 }} placeholder="选择状态">
              <Select.Option value="yes">已关注</Select.Option>
              <Select.Option value="no">未关注</Select.Option>
            </Select>
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
        dataSource={filteredData}
        loading={isLoading}
        rowKey="source_id"
        scroll={{ x: 1180 }}
        size="small"
        pagination={{
          current: currentPage,
          pageSize,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          showTotal: t => `共 ${t} 条`,
          onChange: (page, size) => {
            setCurrentPage(page)
            setPageSize(size)
          },
        }}
      />
    </div>
  )
}

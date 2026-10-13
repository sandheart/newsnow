import { Link, Outlet, createFileRoute, useLocation } from "@tanstack/react-router"
import { Layout, Menu } from "antd"
import { AppstoreOutlined, DatabaseOutlined, FileTextOutlined, HomeOutlined } from "@ant-design/icons"

const { Header, Sider, Content, Footer } = Layout

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
})

const menuItems = [
  {
    key: "source-data",
    icon: <AppstoreOutlined />,
    label: "源数据",
    children: [
      {
        key: "/admin/sources",
        icon: <DatabaseOutlined />,
        label: <Link to="/admin/sources">数据源列表</Link>,
      },
      {
        key: "/admin/news",
        icon: <FileTextOutlined />,
        label: <Link to="/admin/news">新闻列表</Link>,
      },
    ],
  },
]

function AdminLayout() {
  const location = useLocation()
  const selectedKey = location.pathname

  // 根据当前路由自动展开对应的父菜单
  const getOpenKeys = () => {
    if (selectedKey.startsWith("/admin/")) {
      return ["source-data"]
    }
    return []
  }

  const [openKeys, setOpenKeys] = useState(getOpenKeys())

  useEffect(() => {
    setOpenKeys(getOpenKeys())
  }, [selectedKey])

  return (
    <Layout className="min-h-screen bg-white admin-page">
      <Header className="flex items-center px-6 bg-white border-b border-gray-200">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-gray-800 hover:text-blue-600 mr-8">
          <HomeOutlined />
          <span>NewsNow</span>
        </Link>
        <span className="text-gray-500 text-sm">数据管理后台</span>
      </Header>

      <Layout className="bg-white">
        <Sider width={200} className="bg-white border-r border-gray-200">
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            openKeys={openKeys}
            onOpenChange={setOpenKeys}
            items={menuItems}
            className="h-full border-r-0"
          />
        </Sider>
        <Content className="bg-white p-6">
          <Outlet />
        </Content>
      </Layout>

      <Footer className="text-center text-gray-500 text-sm border-t border-gray-200">
        NewsNow 数据管理后台 ©
        {new Date().getFullYear()}
      </Footer>
    </Layout>
  )
}

import React from "react";
import ReactApexChart from "react-apexcharts";
import {
  Badge,
  Box,
  Circle,
  CircularProgress,
  CircularProgressLabel,
  Divider,
  Flex,
  HStack,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  MdArrowDownward,
  MdArrowUpward,
  MdPendingActions,
  MdReportProblem,
  MdTrendingUp,
} from "react-icons/md";

const Sparkline = ({ data, color }) => {
  const max = Math.max(...data, 1);
  const points = data
    .map((value, index) => {
      const x = data.length === 1 ? 0 : (index / (data.length - 1)) * 100;
      const y = 100 - (value / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      style={{ width: "100%", height: 40 }}>
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`${color}44`} />
          <stop offset="100%" stopColor={`${color}00`} />
        </linearGradient>
      </defs>
      <polyline
        fill="url(#sparkFill)"
        stroke="none"
        points={`0,100 ${points} 100,100`}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        points={points}
      />
    </svg>
  );
};

const CardShell = ({ title, subtitle, children }) => {
  const cardBg = useColorModeValue("#ffffff", "#0f172a");
  const border = useColorModeValue("rgba(15,23,42,0.08)", "rgba(255,255,255,0.08)");
  const textMain = useColorModeValue("#0f172a", "#e2e8f0");
  const textSub = useColorModeValue("#475569", "#7a8ca5");
  return (
    <Box
      bg={cardBg}
      borderRadius="14px"
      borderWidth="1px"
      borderColor={border}
      p={4}
      boxShadow="0 16px 42px rgba(0,0,0,0.35)">
      <VStack align="stretch" spacing={2}>
        <Box>
          <Text fontWeight="700" color={textMain}>
            {title}
          </Text>
          {subtitle && (
            <Text fontSize="sm" color={textSub}>
              {subtitle}
            </Text>
          )}
        </Box>
        {children}
      </VStack>
    </Box>
  );
};

export default function Dashboard() {
  const surface = useColorModeValue("#ffffff", "#0b1221");
  const border = useColorModeValue("rgba(15,23,42,0.08)", "rgba(255,255,255,0.08)");
  const textMain = useColorModeValue("#0f172a", "#e2e8f0");
  const textSub = useColorModeValue("#475569", "#93a3b8");

  const kpis = [
    {
      title: "ورود تجهیزات",
      value: "۲,۴۱۰",
      detail: "۱۴ امروز · ۸۴۰ این هفته · ۲,۴۱۰ این ماه",
      color: "#38bdf8",
      trend: [12, 14, 18, 16, 22, 19, 25],
      icon: <MdArrowUpward color="#22c55e" />,
    },
    {
      title: "خروج تجهیزات",
      value: "۱,۹۵۰",
      detail: "۱۲ امروز · ۶۷۰ این هفته · ۱,۹۵۰ این ماه",
      color: "#34d399",
      trend: [10, 12, 14, 13, 17, 15, 18],
      icon: <MdArrowDownward color="#60a5fa" />,
    },
    {
      title: "موجودی بحرانی",
      value: "۴ تجهیز",
      detail: "کمتر از حداقل تعریف شده",
      color: "#f59e0b",
      badge: { text: "هشدار بحرانی", tone: "orange" },
      trend: [2, 3, 4, 4, 5, 4, 4],
      icon: <MdReportProblem color="#fbbf24" />,
    },
    {
      title: "درخواست‌های در انتظار",
      value: "۱۸ مورد",
      detail: "بازرسی ۷ · تراشکاری ۶ · مأموریت ۵",
      color: "#f97316",
      badge: { text: "اولویت پیگیری", tone: "orange" },
      trend: [10, 11, 12, 14, 16, 17, 18],
      icon: <MdPendingActions color="#fb923c" />,
    },
    {
      title: "مأموریت‌های فعال",
      value: "۹ مأموریت",
      detail: "۲۴٪ پیشرفت متوسط",
      color: "#22c55e",
      progress: 24,
      icon: <MdTrendingUp color="#22c55e" />,
    },
    {
      title: "گزارش‌های تاخیردار",
      value: "۶ پرونده",
      detail: "۳ بیش از ۴۸ ساعت · ۳ زیر ۴۸ ساعت",
      color: "#f43f5e",
      badge: { text: "تاخیر", tone: "red" },
      trend: [3, 2, 4, 5, 6, 6, 6],
      icon: <MdReportProblem color="#fb7185" />,
    },
  ];

  const monthlyInbound = [180, 210, 190, 260, 280, 320, 300, 310, 295, 275, 260, 310];
  const monthlyOutbound = [150, 190, 170, 230, 250, 270, 260, 280, 260, 250, 230, 280];

  const entryExitSeries = [
    { name: "ورود", type: "column", data: monthlyInbound },
    { name: "خروج", type: "line", data: monthlyOutbound },
  ];
  const entryExitOptions = {
    chart: { toolbar: { show: false }, foreColor: "#cbd5e1" },
    stroke: { width: [0, 3], curve: "smooth" },
    dataLabels: { enabled: false },
    plotOptions: { bar: { columnWidth: "40%", borderRadius: 6 } },
    colors: ["#38bdf8", "#22c55e"],
    xaxis: {
      categories: ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"],
      labels: { style: { colors: "#7a8ca5" } },
    },
    yaxis: { labels: { style: { colors: "#7a8ca5" } } },
    grid: { borderColor: "rgba(255,255,255,0.04)" },
    legend: { position: "top", labels: { colors: "#e2e8f0" } },
  };

  const inventorySeries = [{ name: "موجودی", data: [45, 32, 28, 24, 20, 15] }];
  const inventoryOptions = {
    chart: { toolbar: { show: false }, foreColor: "#cbd5e1" },
    plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: "60%" } },
    colors: ["#7dd3fc", "#34d399", "#fbbf24", "#fb7185", "#93c5fd", "#60a5fa"],
    xaxis: { categories: ["لوله حفاری", "Stabilizer", "Motor", "MWD Tool", "اجاره‌ای", "قطعات یدکی"], labels: { style: { colors: "#7a8ca5" } } },
    grid: { borderColor: "rgba(255,255,255,0.04)" },
  };

  const unitRequestSeries = [42, 28, 18, 12];
  const unitRequestOptions = {
    chart: { toolbar: { show: false }, foreColor: "#cbd5e1" },
    labels: ["بازرسی", "تراشکاری", "مأموریت دکل", "تعمیرات"],
    dataLabels: { enabled: false },
    legend: { position: "bottom", labels: { colors: "#e2e8f0" } },
    colors: ["#38bdf8", "#34d399", "#f59e0b", "#fb7185"],
    plotOptions: { pie: { donut: { size: "68%" } } },
  };

  const avgTimeSeries = [58, 72, 46];
  const avgTimeOptions = {
    chart: { toolbar: { show: false }, foreColor: "#cbd5e1" },
    labels: ["بازرسی", "تراشکاری", "تعمیرات"],
    plotOptions: {
      radialBar: {
        hollow: { size: "45%" },
        track: { background: "rgba(255,255,255,0.08)" },
        dataLabels: {
          name: { color: "#e2e8f0", fontSize: "12px" },
          value: {
            formatter: (val) => `${Math.round((val / 100) * 4)} روز`,
            color: "#94a3b8",
          },
        },
      },
    },
    colors: ["#38bdf8", "#f97316", "#22c55e"],
    legend: { show: true, position: "bottom", labels: { colors: "#e2e8f0" } },
  };

  const movementRows = [
    {
      asset: "لوله حفاری",
      code: "DR-3321",
      size: '5"',
      direction: "ورود",
      date: "1403/09/08 - 10:24",
      destination: "انبار مرکزی",
      status: "عملیاتی",
    },
    {
      asset: "Stabilizer",
      code: "ST-1188",
      size: '6 3/4"',
      direction: "خروج",
      date: "1403/09/08 - 11:02",
      destination: "دکل سپهر ۲",
      status: "بازرسی",
    },
    {
      asset: "Motor",
      code: "MT-6640",
      size: '6 1/2"',
      direction: "ورود",
      date: "1403/09/07 - 16:40",
      destination: "انبار غربی",
      status: "تعمیر",
    },
    {
      asset: "MWD Tool",
      code: "MW-9002",
      size: '4 3/4"',
      direction: "خروج",
      date: "1403/09/07 - 15:10",
      destination: "دکل خلیج",
      status: "عملیاتی",
    },
  ];

  const openRequests = [
    { type: "درخواست بازرسی", owner: "واحد بازرسی", status: "در انتظار", delay: "۰-۲۴ ساعت" },
    { type: "تراشکاری لوله", owner: "ماشین‌کاری", status: "تاخیر", delay: "۴۸+ ساعت" },
    { type: "مأموریت دکل ۱۲", owner: "عملیات دکل", status: "در حال اجرا", delay: "در حال انجام" },
    { type: "تعمیر موتور 6.75\"", owner: "تعمیرات", status: "در انتظار", delay: "۲۴-۴۸ ساعت" },
  ];

  const criticalInventory = [
    { item: "Motor 6.75\"", unit: "تعمیرات", current: 2, min: 5, risk: "High" },
    { item: "لوله حفاری 5\"", unit: "انبار مرکزی", current: 18, min: 25, risk: "Medium" },
    { item: "Stabilizer 6\"", unit: "بازرسی", current: 4, min: 8, risk: "High" },
    { item: "MWD Tool", unit: "عملیات دکل", current: 3, min: 6, risk: "Medium" },
  ];

  const statusTone = (status) => {
    if (status === "عملیاتی") return "green";
    if (status === "بازرسی") return "blue";
    if (status === "تعمیر") return "orange";
    return "gray";
  };

  const requestTone = (status) => {
    if (status === "تاخیر") return "red";
    if (status === "در حال اجرا") return "green";
    return "yellow";
  };

  const riskTone = (risk) => {
    if (risk === "High") return "red";
    if (risk === "Medium") return "orange";
    return "green";
  };

  return (
    <Box
      pt={{ base: "110px", md: "84px", xl: "84px" }}
      pb={10}
      px={{ base: 4, md: 6, xl: 8 }}
      bgGradient="linear(to-b, #f6f8fb, #eef2f7)"
      minH="100vh">
      <VStack align="stretch" spacing={5}>
        <Flex align="center" justify="space-between" color={textMain}>
          <Box>
            <Text fontSize="2xl" fontWeight="800">
              داشبورد مدیریت عملیات
            </Text>
            <Text fontSize="sm" color={textSub}>
              نمای سریع ورود/خروج، موجودی بحرانی و درخواست‌ها
            </Text>
          </Box>
          <Badge colorScheme="cyan" variant="subtle" px={3} py={1} borderRadius="full" bg="rgba(56,189,248,0.14)">
            به‌روز شده امروز
          </Badge>
        </Flex>

        <SimpleGrid columns={{ base: 1, sm: 2, xl: 3, "2xl": 6 }} gap={4}>
          {kpis.map((item) => (
            <Box
              key={item.title}
              bg={surface}
              borderRadius="14px"
              p={4}
              borderWidth="1px"
              borderColor={border}
              boxShadow="0 14px 32px rgba(0,0,0,0.35)">
              <Flex align="center" justify="space-between" mb={2}>
                <Text fontWeight="700" color={textMain}>
                  {item.title}
                </Text>
                <Circle size="32px" bg="rgba(255,255,255,0.06)">
                  {item.icon}
                </Circle>
              </Flex>
              <Text fontSize="2xl" fontWeight="800" color={item.color}>
                {item.value}
              </Text>
              <Text fontSize="sm" color={textSub} mb={3}>
                {item.detail}
              </Text>
              {item.progress ? (
                <HStack spacing={3} align="center">
                  <CircularProgress value={item.progress} color={item.color} trackColor="rgba(255,255,255,0.06)" size="72px" thickness="10px">
                    <CircularProgressLabel color={textMain} fontSize="sm">
                      {item.progress}%
                    </CircularProgressLabel>
                  </CircularProgress>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" color={textSub}>
                      درصد پیشرفت مأموریت‌ها
                    </Text>
                    <Badge colorScheme="cyan" bg="rgba(56,189,248,0.14)">
                      رصد لحظه‌ای
                    </Badge>
                  </VStack>
                </HStack>
              ) : (
                <>
                  {item.badge && (
                    <Badge colorScheme={item.badge.tone} variant="subtle" mb={1} width="fit-content" px={2}>
                      {item.badge.text}
                    </Badge>
                  )}
                  <Sparkline data={item.trend} color={item.color} />
                </>
              )}
            </Box>
          ))}
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
          <CardShell
            title="روند ورود و خروج ماهانه"
            subtitle="ترکیب خطی و ستونی برای تصویر واضح از حجم عملیات">
            <Box h="320px" pt={2}>
              <ReactApexChart options={entryExitOptions} series={entryExitSeries} type="line" height="100%" />
            </Box>
          </CardShell>

          <CardShell
            title="موجودی انواع تجهیزات"
            subtitle="نمای مقایسه‌ای افقی برای دسته‌های پرتعداد">
            <Box h="320px" pt={2}>
              <ReactApexChart options={inventoryOptions} series={inventorySeries} type="bar" height="100%" />
            </Box>
          </CardShell>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
          <CardShell
            title="درخواست‌های واحدها"
            subtitle="توزیع بار کاری بین واحدهای عملیاتی">
            <Box h="280px" pt={2}>
              <ReactApexChart options={unitRequestOptions} series={unitRequestSeries} type="donut" height="100%" />
            </Box>
          </CardShell>

          <CardShell
            title="میانگین زمان انجام عملیات"
            subtitle="بر اساس SLA چهارروزه">
            <Box h="280px" pt={2}>
              <ReactApexChart options={avgTimeOptions} series={avgTimeSeries} type="radialBar" height="100%" />
            </Box>
          </CardShell>

          <CardShell
            title="وضعیت موجودی بحرانی"
            subtitle="برای واکنش سریع به کمبودها">
            <VStack align="stretch" spacing={3} pt={2}>
              {criticalInventory.map((row) => (
                <Flex
                  key={row.item}
                  align="center"
                  justify="space-between"
                  bg="rgba(255,255,255,0.03)"
                  borderRadius="12px"
                  px={3}
                  py={2}
                  borderWidth="1px"
                  borderColor="rgba(255,255,255,0.05)">
                  <Box>
                    <Text fontWeight="700" color="#e2e8f0">
                      {row.item}
                    </Text>
                    <Text fontSize="sm" color="#93a3b8">
                      {row.unit}
                    </Text>
                  </Box>
                  <HStack spacing={3} align="center">
                    <Badge colorScheme="cyan" variant="outline">
                      {row.current} فعلی
                    </Badge>
                    <Badge colorScheme="orange" variant="outline">
                      حداقل {row.min}
                    </Badge>
                    <Badge colorScheme={riskTone(row.risk)}>{row.risk}</Badge>
                  </HStack>
                </Flex>
              ))}
            </VStack>
          </CardShell>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
          <CardShell
            title="آخرین ورود و خروج‌ها"
            subtitle="ردیابی سریع آخرین حرکت موجودی">
            <Table variant="simple" size="sm" colorScheme="whiteAlpha">
              <Thead>
                <Tr>
                  <Th color="#93a3b8">نوع تجهیز</Th>
                  <Th color="#93a3b8">کد</Th>
                  <Th color="#93a3b8">سایز</Th>
                  <Th color="#93a3b8">ورود/خروج</Th>
                  <Th color="#93a3b8">تاریخ/ساعت</Th>
                  <Th color="#93a3b8">مقصد</Th>
                  <Th color="#93a3b8">وضعیت</Th>
                </Tr>
              </Thead>
              <Tbody>
                {movementRows.map((row) => (
                  <Tr key={row.code}>
                    <Td color="#e2e8f0">{row.asset}</Td>
                    <Td color="#e2e8f0">{row.code}</Td>
                    <Td color="#e2e8f0">{row.size}</Td>
                    <Td>
                      <Badge colorScheme={row.direction === "ورود" ? "cyan" : "green"}>{row.direction}</Badge>
                    </Td>
                    <Td color="#e2e8f0">{row.date}</Td>
                    <Td color="#e2e8f0">{row.destination}</Td>
                    <Td>
                      <Badge colorScheme={statusTone(row.status)}>{row.status}</Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardShell>

          <CardShell
            title="درخواست‌های باز"
            subtitle="برای پیگیری تاخیر و اولویت بندی">
            <Table variant="simple" size="sm" colorScheme="whiteAlpha">
              <Thead>
                <Tr>
                  <Th color="#93a3b8">درخواست</Th>
                  <Th color="#93a3b8">مسئول</Th>
                  <Th color="#93a3b8">وضعیت</Th>
                  <Th color="#93a3b8">تأخیر</Th>
                </Tr>
              </Thead>
              <Tbody>
                {openRequests.map((row) => (
                  <Tr key={row.type}>
                    <Td color="#e2e8f0">{row.type}</Td>
                    <Td color="#e2e8f0">{row.owner}</Td>
                    <Td>
                      <Badge colorScheme={requestTone(row.status)}>{row.status}</Badge>
                    </Td>
                    <Td color="#e2e8f0">{row.delay}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardShell>
        </SimpleGrid>

        <Box
          bg={surface}
          borderRadius="14px"
          p={4}
          borderWidth="1px"
          borderColor={border}
          boxShadow="0 14px 32px rgba(0,0,0,0.35)">
          <Flex align="center" justify="space-between" mb={3}>
            <Box>
              <Text fontWeight="700" color="#e2e8f0">
                هشدارهای موجودی
              </Text>
              <Text fontSize="sm" color="#93a3b8">
                اقلامی که زیر حداقل تعریف شده‌اند
              </Text>
            </Box>
            <Badge colorScheme="red" variant="subtle" px={3} py={1} borderRadius="full">
              نیاز به اقدام
            </Badge>
          </Flex>
          <Divider borderColor="rgba(255,255,255,0.08)" mb={3} />
          <Table variant="simple" size="sm" colorScheme="whiteAlpha">
            <Thead>
              <Tr>
                <Th color="#93a3b8">تجهیز</Th>
                <Th color="#93a3b8">واحد</Th>
                <Th color="#93a3b8">موجودی فعلی</Th>
                <Th color="#93a3b8">حداقل</Th>
                <Th color="#93a3b8">شدت خطر</Th>
              </Tr>
            </Thead>
            <Tbody>
              {criticalInventory.map((row) => (
                <Tr key={`${row.item}-${row.unit}`}>
                  <Td color="#e2e8f0">{row.item}</Td>
                  <Td color="#e2e8f0">{row.unit}</Td>
                  <Td color="#e2e8f0">{row.current}</Td>
                  <Td color="#e2e8f0">{row.min}</Td>
                  <Td>
                    <Badge colorScheme={riskTone(row.risk)}>{row.risk}</Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </VStack>
    </Box>
  );
}

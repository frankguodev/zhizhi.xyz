# Source: Windows 11 台式机断电后连不上网

Article: `summery/06_publish/windows-11-ethernet-169254-after-power-outage.md`

Core idea:

- Windows 11 台式机睡眠时遇到断电，恢复后有线网络连不上。
- 手机 Wi-Fi 正常，但台式机有线网络显示地球图标。
- `ipconfig` 出现 `169.254.x.x` 且默认网关为空。
- 文章主线：这通常意味着没有从路由器 DHCP 获取正常 IP，应先查网线、LAN 口、网口灯和 DHCP，再考虑驱动、网络重置或硬件。

Desired social-share image:

- 16:9 / 1200x630 style.
- Chinese title, concise.
- Visual should communicate Windows desktop + Ethernet + diagnostic IP clue.
- Avoid brand logos, avoid realistic humans, avoid too much tiny UI text.

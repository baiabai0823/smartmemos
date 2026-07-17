import UIKit
import UserNotifications
import UserNotificationsUI

final class NotificationViewController: UIViewController, UNNotificationContentExtension {
    private let titleLabel = UILabel()
    private let badgeLabel = PaddingLabel(insets: UIEdgeInsets(top: 5, left: 10, bottom: 5, right: 10))
    private let remainingLabel = UILabel()
    private let deadlineLabel = UILabel()
    private let bodyLabel = UILabel()
    private let timePanel = UIView()
    private let accentBar = UIView()

    override func viewDidLoad() {
        super.viewDidLoad()
        buildInterface()
    }

    func didReceive(_ notification: UNNotification) {
        let content = notification.request.content
        let extra = content.userInfo
        let level = extra["level"] as? String ?? "normal"
        let palette = Palette(level: level, trait: traitCollection)

        titleLabel.text = content.title
        remainingLabel.text = extra["remaining"] as? String ?? content.subtitle
        deadlineLabel.text = "Due \(extra["deadline"] as? String ?? "Soon")"
        bodyLabel.text = content.body
        badgeLabel.text = level == "urgent" ? "TIME SENSITIVE" : level == "near" ? "APPROACHING" : "REMINDER"
        badgeLabel.textColor = palette.accent
        badgeLabel.backgroundColor = palette.badge
        timePanel.backgroundColor = palette.panel
        remainingLabel.textColor = palette.accent
        accentBar.backgroundColor = palette.accent
    }

    private func buildInterface() {
        view.backgroundColor = .clear
        let material = UIVisualEffectView(effect: UIBlurEffect(style: .systemMaterial))
        material.layer.cornerRadius = 24
        material.layer.cornerCurve = .continuous
        material.clipsToBounds = true
        material.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(material)

        titleLabel.font = .systemFont(ofSize: 23, weight: .bold)
        titleLabel.numberOfLines = 2
        titleLabel.adjustsFontSizeToFitWidth = true
        titleLabel.minimumScaleFactor = 0.78

        badgeLabel.font = .systemFont(ofSize: 11, weight: .bold)
        badgeLabel.layer.cornerRadius = 12
        badgeLabel.layer.cornerCurve = .continuous
        badgeLabel.clipsToBounds = true
        badgeLabel.setContentCompressionResistancePriority(.required, for: .horizontal)

        remainingLabel.font = .systemFont(ofSize: 28, weight: .bold)
        remainingLabel.adjustsFontSizeToFitWidth = true
        remainingLabel.minimumScaleFactor = 0.7
        deadlineLabel.font = .systemFont(ofSize: 15, weight: .medium)
        deadlineLabel.textColor = .secondaryLabel
        bodyLabel.font = .systemFont(ofSize: 16, weight: .medium)
        bodyLabel.textColor = .label
        bodyLabel.numberOfLines = 2

        timePanel.layer.cornerRadius = 18
        timePanel.layer.cornerCurve = .continuous
        timePanel.translatesAutoresizingMaskIntoConstraints = false
        accentBar.layer.cornerRadius = 2
        accentBar.translatesAutoresizingMaskIntoConstraints = false

        let heading = UIStackView(arrangedSubviews: [titleLabel, badgeLabel])
        heading.axis = .horizontal
        heading.alignment = .top
        heading.spacing = 12

        let timeCopy = UIStackView(arrangedSubviews: [remainingLabel, deadlineLabel])
        timeCopy.axis = .vertical
        timeCopy.spacing = 3
        timeCopy.translatesAutoresizingMaskIntoConstraints = false
        timePanel.addSubview(accentBar)
        timePanel.addSubview(timeCopy)

        let stack = UIStackView(arrangedSubviews: [heading, timePanel, bodyLabel])
        stack.axis = .vertical
        stack.spacing = 14
        stack.translatesAutoresizingMaskIntoConstraints = false
        material.contentView.addSubview(stack)

        NSLayoutConstraint.activate([
            material.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            material.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -8),
            material.topAnchor.constraint(equalTo: view.topAnchor, constant: 5),
            material.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -5),
            stack.leadingAnchor.constraint(equalTo: material.contentView.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: material.contentView.trailingAnchor, constant: -20),
            stack.topAnchor.constraint(equalTo: material.contentView.topAnchor, constant: 18),
            stack.bottomAnchor.constraint(equalTo: material.contentView.bottomAnchor, constant: -18),
            timePanel.heightAnchor.constraint(greaterThanOrEqualToConstant: 82),
            accentBar.leadingAnchor.constraint(equalTo: timePanel.leadingAnchor),
            accentBar.topAnchor.constraint(equalTo: timePanel.topAnchor, constant: 14),
            accentBar.bottomAnchor.constraint(equalTo: timePanel.bottomAnchor, constant: -14),
            accentBar.widthAnchor.constraint(equalToConstant: 4),
            timeCopy.leadingAnchor.constraint(equalTo: timePanel.leadingAnchor, constant: 18),
            timeCopy.trailingAnchor.constraint(equalTo: timePanel.trailingAnchor, constant: -16),
            timeCopy.centerYAnchor.constraint(equalTo: timePanel.centerYAnchor)
        ])
    }
}

private struct Palette {
    let accent: UIColor
    let panel: UIColor
    let badge: UIColor

    init(level: String, trait: UITraitCollection) {
        switch level {
        case "urgent":
            accent = UIColor(red: 0.78, green: 0.15, blue: 0.20, alpha: 1)
            panel = UIColor(red: 0.98, green: 0.88, blue: 0.87, alpha: trait.userInterfaceStyle == .dark ? 0.22 : 0.94)
            badge = UIColor(red: 0.78, green: 0.15, blue: 0.20, alpha: 0.13)
        case "near":
            accent = UIColor(red: 0.72, green: 0.43, blue: 0.12, alpha: 1)
            panel = UIColor(red: 0.98, green: 0.91, blue: 0.79, alpha: trait.userInterfaceStyle == .dark ? 0.20 : 0.94)
            badge = UIColor(red: 0.72, green: 0.43, blue: 0.12, alpha: 0.13)
        default:
            accent = UIColor(red: 0.58, green: 0.45, blue: 0.24, alpha: 1)
            panel = UIColor(red: 0.95, green: 0.92, blue: 0.86, alpha: trait.userInterfaceStyle == .dark ? 0.18 : 0.94)
            badge = UIColor(red: 0.58, green: 0.45, blue: 0.24, alpha: 0.12)
        }
    }
}

private final class PaddingLabel: UILabel {
    private let insets: UIEdgeInsets
    init(insets: UIEdgeInsets) { self.insets = insets; super.init(frame: .zero) }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    override func drawText(in rect: CGRect) { super.drawText(in: rect.inset(by: insets)) }
    override var intrinsicContentSize: CGSize {
        let size = super.intrinsicContentSize
        return CGSize(width: size.width + insets.left + insets.right, height: size.height + insets.top + insets.bottom)
    }
}

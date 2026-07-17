#!/usr/bin/env ruby

require "xcodeproj"

root = File.expand_path("../../..", __dir__)
project_path = File.join(root, "release/SmartMemo-iOS/ios/App/App.xcodeproj")
project = Xcodeproj::Project.open(project_path)
app_target = project.targets.find { |target| target.name == "App" }
abort("Capacitor App target was not found") unless app_target

project.targets.select { |target| target.name == "SmartMemoNotification" }.each(&:remove_from_project)
extension_target = project.new_target(:app_extension, "SmartMemoNotification", :ios, "14.0")

group = project.main_group.new_group("SmartMemoNotification", "../../native/SmartMemoNotification")
swift_ref = group.new_file("NotificationViewController.swift")
storyboard_ref = group.new_file("MainInterface.storyboard")
group.new_file("Info.plist")
extension_target.source_build_phase.add_file_reference(swift_ref)
extension_target.resources_build_phase.add_file_reference(storyboard_ref)

extension_target.build_configurations.each do |configuration|
  settings = configuration.build_settings
  settings["PRODUCT_BUNDLE_IDENTIFIER"] = "com.baiabai.smartmemo.notification"
  settings["PRODUCT_NAME"] = "SmartMemoNotification"
  settings["INFOPLIST_FILE"] = "../../native/SmartMemoNotification/Info.plist"
  settings["SWIFT_VERSION"] = "5.0"
  settings["TARGETED_DEVICE_FAMILY"] = "1"
  settings["IPHONEOS_DEPLOYMENT_TARGET"] = "14.0"
  settings["APPLICATION_EXTENSION_API_ONLY"] = "YES"
  settings["GENERATE_INFOPLIST_FILE"] = "NO"
  settings["SKIP_INSTALL"] = "YES"
  settings["CODE_SIGN_STYLE"] = "Automatic"
  settings["MARKETING_VERSION"] = "1.1.0"
  settings["CURRENT_PROJECT_VERSION"] = "2"
end

app_target.add_dependency(extension_target)
embed_phase = app_target.copy_files_build_phases.find { |phase| phase.name == "Embed App Extensions" }
unless embed_phase
  embed_phase = project.new(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase)
  embed_phase.name = "Embed App Extensions"
  embed_phase.dst_subfolder_spec = "13"
  app_target.build_phases << embed_phase
end
embed_phase.add_file_reference(extension_target.product_reference, true)

project.save
puts "Configured SmartMemoNotification content extension"

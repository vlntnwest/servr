import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import React, { useEffect, useMemo } from "react";
import dayjs from "dayjs";
import Picker from "react-mobile-picker";
import { useShoppingCart } from "../../Context/ShoppingCartContext";
import { isEmpty } from "../../Utils";
import { useShop } from "../../Context/ShopContext";

const OrderDate = () => {
  const { selectedDate, setSelectedDate } = useShoppingCart();
  const { openingHours, isMobile, availableDates } = useShop();

  // Function to generate time slots between start and end with a given step (minutes)
  const generateTimeSlots = (start, end, step, minTime = null) => {
    const slots = [];
    let current = start;

    while (current.isBefore(end)) {
      const next = current.add(step, "minute");

      if (next.isAfter(end)) break;

      // Skip slots before the minimum allowed time
      if (minTime && current.isBefore(minTime)) {
        current = next;
        continue;
      }

      slots.push(`${current.format("HH:mm")} - ${next.format("HH:mm")}`);
      current = next;
    }

    return slots;
  };

  // Memoized time slots based on selected date
  const availableTimes = useMemo(() => {
    // Find the day corresponding to the selected label
    const selectedDayObj = availableDates.find(
      (d) => d.label === selectedDate.date
    );

    if (!selectedDayObj) return [];

    const selectedDay = selectedDayObj.value;
    const now = dayjs();
    const minimumTime = selectedDay.isSame(now, "day")
      ? now.add(30, "minute")
      : null;

    // Define lunch and dinner time windows
    const { lunchStart, lunchEnd, dinnerStart, dinnerEnd } = openingHours;

    const interval = 15;

    const lunchSlots = generateTimeSlots(
      lunchStart,
      lunchEnd,
      interval,
      minimumTime
    );
    const dinnerSlots = generateTimeSlots(
      dinnerStart,
      dinnerEnd,
      interval,
      minimumTime
    );

    return [...lunchSlots, ...dinnerSlots];
  }, [selectedDate.date, availableDates, openingHours]);

  useEffect(() => {
    const dayOfWeek = dayjs().day();
    if (!isEmpty(selectedDate.time)) return;
    if (dayOfWeek === 1) {
      setSelectedDate({ date: "Demain", time: availableTimes[0] });
    } else if (dayOfWeek !== 0 && dayOfWeek !== 1) {
      setSelectedDate({ date: "Aujourd'hui", time: availableTimes[0] });
    }
  }, [setSelectedDate, selectedDate?.time, availableTimes]);

  const handleSelectChange = (field) => (event) => {
    setSelectedDate((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  return (
    !isEmpty(availableDates) && (
      <Box sx={{ display: "flex", gap: 2 }}>
        <Box sx={{ width: "100%" }}>
          {isMobile ? (
            <Picker
              value={selectedDate}
              onChange={(newValue) =>
                setSelectedDate((prev) => ({
                  ...prev,
                  ...newValue,
                }))
              }
            >
              <Picker.Column name="date">
                {availableDates.map((day, index) => (
                  <Picker.Item key={index} value={day.label}>
                    {day.label}
                  </Picker.Item>
                ))}
              </Picker.Column>
              <Picker.Column name="time">
                {availableTimes.map((time, index) => (
                  <Picker.Item key={index} value={time}>
                    {time}
                  </Picker.Item>
                ))}
              </Picker.Column>
            </Picker>
          ) : (
            <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
              <FormControl fullWidth>
                <InputLabel id="select-date-label">Date</InputLabel>
                <Select
                  labelId="select-date-label"
                  value={selectedDate.date || ""}
                  label="Date"
                  onChange={handleSelectChange("date")}
                >
                  {availableDates.map((day, index) => (
                    <MenuItem key={index} value={day.label}>
                      {day.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="select-time-label">Heure</InputLabel>
                <Select
                  labelId="select-time-label"
                  value={selectedDate.time || ""}
                  label="Heure"
                  onChange={handleSelectChange("time")}
                >
                  {availableTimes.map((time, index) => (
                    <MenuItem key={index} value={time}>
                      {time}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </Box>
      </Box>
    )
  );
};

export default OrderDate;
